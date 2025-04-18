import uuid
import json
from db import get_db
from typing import List

def get_all_notes(limit=None, tag=None, category_id=None, userid=None):
    conn = get_db()
    cur = conn.cursor()

    query = """
        SELECT n.*, 
               c.name AS category_name,
               nb.name AS notebook_name
        FROM notes n
        LEFT JOIN categories c ON n.category_id = c.id
        LEFT JOIN notebooks nb ON c.notebook_id = nb.id
        WHERE n.archived = 0
    """
    params = []

    if category_id:
        query += " AND n.category_id = ?"
        params.append(category_id)

    if userid:
        query += " AND n.userid = ?"
        params.append(userid)

    query += " ORDER BY n.created_at DESC"

    if limit:
        query += f" LIMIT {limit}"

    rows = cur.execute(query, params).fetchall()
    notes = []

    for row in rows:
        note = dict(row)
        note['tags'] = json.loads(note.get('tags') or '[]')

        if tag and tag not in note['tags']:
            continue

        notes.append(note)

    return notes


def get_note_by_id(note_id):
    conn = get_db()
    note = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    conn.close()
    return dict(note) if note else None

def create_note(data, userid):
    print("\U0001f9ea [DEBUG] 接收到 tags:", data.get('tags'))
    print("\U0001f9ea [DEBUG] 寫入 tags（JSON 字串）:", json.dumps(data.get('tags')))
    conn = get_db()
    note_id = str(uuid.uuid4())
    with conn:
        conn.execute(
            '''
            INSERT INTO notes (id, title, content, tags, category_id, created_at, archived, userid)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            ''',
            (note_id, data['title'], data['content'], json.dumps(data['tags']), data['category_id'], data['created_at'], userid)
        )
    return note_id

def update_note(note_id, data):
    conn = get_db()
    with conn:
        result = conn.execute(
            "UPDATE notes SET title=?, content=?, tags=?, category_id=? WHERE id=?",
            (
                data['title'],
                data['content'],
                json.dumps(data['tags']),
                data['category_id'],
                note_id
            )
        )
        return result.rowcount > 0

def update_note_category(note_id, category_id):
    conn = get_db()
    with conn:
        result = conn.execute(
            "UPDATE notes SET category_id=? WHERE id=?",
            (category_id, note_id)
        )
        return result.rowcount > 0

def delete_note(note_id):
    conn = get_db()
    with conn:
        conn.execute("UPDATE notes SET archived = 1 WHERE id = ?", (note_id,))

def get_notes(limit=None, userid=None):
    conn = get_db()
    cur = conn.cursor()

    query = "SELECT * FROM notes WHERE archived = 0"
    params = []

    if userid:
        query += " AND userid = ?"
        params.append(userid)

    query += " ORDER BY created_at DESC"

    if limit:
        query += f" LIMIT {limit}"

    rows = cur.execute(query, params).fetchall()
    return [dict(row) for row in rows]

def query_notes_by_conditions(tags: List[str], category_ids: List[int], userids: List[str], mode: str, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()

    where_clauses = []
    values = []

    def build_clause(field, values_list):
        if not values_list:
            return None, []
        if mode == 'all':
            return ' AND '.join([f"{field} LIKE ?" for _ in values_list]), [f"%{v}%" for v in values_list]
        else:
            return ' OR '.join([f"{field} LIKE ?" for _ in values_list]), [f"%{v}%" for v in values_list]

    tag_clause, tag_vals = build_clause('tags', tags) if tags else (None, [])
    user_clause, user_vals = build_clause('userid', userids) if userids else (None, [])

    if category_ids:
        cat_clause = ' OR '.join(["category_id = ?" for _ in category_ids])
        cat_vals = category_ids
    else:
        cat_clause, cat_vals = None, []

    for clause, vals in [(tag_clause, tag_vals), (cat_clause, cat_vals), (user_clause, user_vals)]:
        if clause:
            where_clauses.append(f"({clause})")
            values.extend(vals)

    where_sql = ' AND '.join(where_clauses) if mode == 'all' else ' OR '.join(where_clauses)

    query = "SELECT * FROM notes WHERE archived = 0"
    if where_sql:
        query += f" AND ({where_sql})"

    cursor.execute(query, values)
    result = cursor.fetchall()
    conn.close()
    return result
