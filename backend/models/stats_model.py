import json
from db import get_db


def get_dashboard_stats():
    conn = get_db()
    cur = conn.cursor()

    total_notes = cur.execute("SELECT COUNT(*) FROM notes WHERE archived = 0").fetchone()[0]
    unique_categories = cur.execute("SELECT COUNT(DISTINCT category) FROM notes WHERE archived = 0").fetchone()[0]
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

    last_updated = cur.execute("SELECT MAX(created_at) FROM notes").fetchone()[0]

    return {
        "total_notes": total_notes,
        "unique_categories": unique_categories,
        "unique_tags": len(tag_set),
        "last_updated": last_updated
    }
