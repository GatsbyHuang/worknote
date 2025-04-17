import json
from db import get_db

def get_dashboard_stats():
    conn = get_db()
    cur = conn.cursor()

    # 總筆記數
    total_notes = cur.execute("SELECT COUNT(*) FROM notes WHERE archived = 0").fetchone()[0]

    # 不重複的 category_id 數（非 NULL）
    unique_categories = cur.execute("SELECT COUNT(DISTINCT category_id) FROM notes WHERE archived = 0 AND category_id IS NOT NULL").fetchone()[0]

    # tags 統計
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

    return {
        "total_notes": total_notes,
        "unique_categories": unique_categories,
        "unique_tags": len(tag_set),
        "last_updated": last_updated
    }
