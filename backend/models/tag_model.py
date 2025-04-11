import json
from db import get_db

def get_all_tags():
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT tags FROM notes WHERE archived = 0").fetchall()

    tag_count = {}
    for row in rows:
        try:
            tags = json.loads(row["tags"] or "[]")
            for tag in tags:
                tag_count[tag] = tag_count.get(tag, 0) + 1
        except Exception as e:
            print(f"[WARN] tag parse error: {e}")

    # 轉換為 list
    return [{"name": tag, "count": count} for tag, count in tag_count.items()]
