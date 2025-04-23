import json
from db import get_db
from collections import defaultdict
from datetime import datetime


def get_notebook_stats():
    conn = get_db()
    cur = conn.cursor()

    # Get all notebooks
    cur.execute("SELECT id, name FROM notebooks")
    notebooks = cur.fetchall()

    results = []

    for nb in notebooks:
        notebook_id = nb['id']
        notebook_name = nb['name']

        # Get all categories under this notebook
        cur.execute("SELECT id, name FROM categories WHERE notebook_id = ?", (notebook_id,))
        categories = cur.fetchall()
        category_map = {c['id']: c['name'] for c in categories}

        # Get all notes under this notebook (via its categories)
        cur.execute("""
            SELECT n.tags, n.updated_at, n.category_id
            FROM notes n
            JOIN categories c ON n.category_id = c.id
            WHERE c.notebook_id = ? AND n.archived = 0
        """, (notebook_id,))
        notes = cur.fetchall()

        if not notes:
            continue  # ❗️ 如果沒有 notes，跳過這個 notebook

        tag_counter = defaultdict(int)
        cat_counter = defaultdict(int)
        total_notes = 0
        last_updated = None

        for note in notes:
            total_notes += 1

            # Tags (stored as JSON string or comma-separated)
            try:
                tags = json.loads(note['tags']) if note['tags'].strip().startswith('[') else note['tags'].split(',')
            except:
                tags = []
            for tag in tags:
                tag = tag.strip()
                if tag:
                    tag_counter[tag] += 1

            # Categories
            cat_id = note['category_id']
            if cat_id in category_map:
                cat_counter[category_map[cat_id]] += 1

            # Last Updated
            note_updated = note['updated_at']
            if not last_updated or note_updated > last_updated:
                last_updated = note_updated

        results.append({
            "name": notebook_name,
            "total_notes": total_notes,
            "last_updated": last_updated.split(' ')[0] if last_updated else None,
            "tags": [
                {"name": name, "count": count}
                for name, count in sorted(tag_counter.items(), key=lambda x: -x[1])[:10]  # 取前10
            ],
            "categories": [
                {"name": name, "count": count}
                for name, count in sorted(cat_counter.items(), key=lambda x: -x[1])[:10]  # 取前10
            ]
        })

    conn.close()
    return results
    
def get_dashboard_stats():
    conn = get_db()
    cur = conn.cursor()

    # 總筆記數
    total_notes = cur.execute("SELECT COUNT(*) FROM notes WHERE archived = 0").fetchone()[0]

    # 不重複的 category 數
    unique_categories = cur.execute("SELECT COUNT(DISTINCT category_id) FROM notes WHERE archived = 0 AND category_id IS NOT NULL").fetchone()[0]

    # 所有 tags 統計
    all_tags = cur.execute("SELECT tags FROM notes WHERE archived = 0").fetchall()
    tag_set = set()
    for row in all_tags:
        raw_tags = row[0]
        if not raw_tags:
            continue
        try:
            tags = json.loads(raw_tags)
            if isinstance(tags, list):
                tag_set.update(tags)
        except Exception as e:
            print(f"[❌ Tag Parse Error] value={raw_tags} err={e}")

    # 最後更新時間
    last_updated = cur.execute("SELECT MAX(created_at) FROM notes").fetchone()[0]

    # ✅ Notebook 統計
    # 取得每個 notebook 的名稱與筆記數量
    top_notebooks = cur.execute("""
        SELECT nb.name AS name, COUNT(n.id) AS count
        FROM notes n
        JOIN categories c ON n.category_id = c.id
        JOIN notebooks nb ON c.notebook_id = nb.id
        WHERE n.archived = 0
        GROUP BY nb.id
        ORDER BY count DESC
        LIMIT 10
    """).fetchall()

    # ✅ 總 notebook 數量
    total_notebooks = cur.execute("SELECT COUNT(*) FROM notebooks").fetchone()[0]
    conn.close()
    
    return {
        "total_notes": total_notes,
        "unique_categories": unique_categories,
        "unique_tags": len(tag_set),
        "last_updated": last_updated,
        "total_notebooks": total_notebooks,
        "top_notebooks": [dict(row) for row in top_notebooks]
    }
