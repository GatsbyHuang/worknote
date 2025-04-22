import json
from db import get_db

def get_all_tags_old():
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


def get_all_tags(notebook_id=None, category_id=None):
    conn = get_db()
    cursor = conn.cursor()

    # 動態組 SQL 查詢
    query = '''
        SELECT notes.tags FROM notes
        LEFT JOIN categories ON notes.category_id = categories.id
        LEFT JOIN notebooks ON categories.notebook_id = notebooks.id
        WHERE notes.archived = 0
    '''
    params = []

    if notebook_id is not None:
        query += ' AND notebooks.id = ?'
        params.append(notebook_id)

    if category_id is not None:
        query += ' AND categories.id = ?'
        params.append(category_id)

    rows = cursor.execute(query, params).fetchall()

    # 計算 tag 數量
    tag_count = {}
    for row in rows:
        try:
            tags = json.loads(row["tags"] or "[]")
            for tag in tags:
                tag_count[tag] = tag_count.get(tag, 0) + 1
        except Exception as e:
            print(f"[WARN] tag parse error: {e}")

    return [{"name": tag, "count": count} for tag, count in tag_count.items()]
