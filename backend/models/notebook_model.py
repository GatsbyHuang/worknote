from db import get_db
import sqlite3


def fetch_all_notebooks():
    conn = get_db()
    cur = conn.cursor()
    rows = cur.execute('SELECT id, name, description FROM notebooks ORDER BY name ASC').fetchall()
    conn.close()
    return [dict(row) for row in rows]


def create_notebook(data):
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()

    if not name:
        return {'body': {'error': 'Name is required'}, 'status': 400}

    conn = get_db()
    with conn:
        try:
            conn.execute("INSERT INTO notebooks (name, description) VALUES (?, ?)", (name, description))
        except sqlite3.IntegrityError:
            return {'body': {'error': 'Notebook already exists'}, 'status': 409}
    conn.close()
    return {'body': {'status': 'ok', 'name': name}, 'status': 201}


def update_notebook_by_id(notebook_id, data):
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()

    if not name:
        return {'body': {'error': 'Name is required'}, 'status': 400}

    conn = get_db()
    with conn:
        cur = conn.execute(
            "UPDATE notebooks SET name = ?, description = ? WHERE id = ?",
            (name, description, notebook_id)
        )
        if cur.rowcount == 0:
            return {'body': {'error': 'Notebook not found'}, 'status': 404}
    conn.close()
    return {'body': {'status': 'updated', 'id': notebook_id}, 'status': 200}


def delete_notebook_by_id(notebook_id):
    conn = get_db()

    # 🔍 先檢查是否有 category 使用這個 notebook_id
    linked = conn.execute("SELECT COUNT(*) FROM categories WHERE notebook_id = ?", (notebook_id,)).fetchone()[0]
    print(f"linked categories:{linked}")
    if linked > 0:
        return {
            'body': {'error': f'Notebook is still linked to {linked} categories.'},
            'status': 500
        }

    # ✅ 沒有任何關聯 category，才允許刪除
    with conn:
        cur = conn.execute("DELETE FROM notebooks WHERE id = ?", (notebook_id,))
        if cur.rowcount == 0:
            return {'body': {'error': 'Notebook not found'}, 'status': 404}
    conn.close()
    return {'body': {'status': 'deleted', 'id': notebook_id}, 'status': 200}
