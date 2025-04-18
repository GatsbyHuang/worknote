import json
from db import get_db

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

    return {
        "total_notes": total_notes,
        "unique_categories": unique_categories,
        "unique_tags": len(tag_set),
        "last_updated": last_updated,
        "total_notebooks": total_notebooks,
        "top_notebooks": [dict(row) for row in top_notebooks]
    }
