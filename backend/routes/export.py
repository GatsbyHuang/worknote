from flask import Blueprint, jsonify, request
from pathlib import Path
from datetime import datetime
from db import init_db, get_db
import json
from models.export_model import (
    query_notes_by_conditions,get_distinct_userids
)
# ✅ 補上這一行初始化 Blueprint
export_bp = Blueprint('export', __name__, url_prefix='/api/export')

@export_bp.route('/preview', methods=['POST'])
def preview_export():
    data = request.json
    notes = query_notes_by_conditions(data['tags'], data['categories'], data['userids'], data['notebooks'], data['mode'])
    return jsonify({'count': len(notes)})
    
@export_bp.route('/execute', methods=['POST'])
def execute_export():
    data = request.json
    notes = query_notes_by_conditions(
        data['tags'], data['categories'], data['userids'], data['notebooks'], data['mode']
    )
    print(f"total export notes : {len(notes)}")
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    export_db_path = Path(f'notes_export{timestamp}.db')
    init_db(export_db_path, with_defaults=False)

    conn = get_db(export_db_path)
    main_conn = get_db()  # 原始主資料庫

    with conn:
        # ✅ 匯出 notes
        for note in notes:
            conn.execute('''
                INSERT INTO notes (id, title, content, tags, category_id, created_at, userid, archived)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                note['id'], note['title'], note['content'],
                note['tags'], note['category_id'], note['created_at'],
                note['userid'], note['archived']
            ))

        # ✅ 1. 找出所有 category_id → 推出 notebook_id
        category_ids = {note['category_id'] for note in notes if note['category_id']}
        print(f"category_ids:{category_ids}")

        if not category_ids:
            main_conn.close()
            return jsonify({'message': 'No categories to export', 'filename': export_db_path.name})

        q1 = f'''
            SELECT DISTINCT c.id, c.name, c.notebook_id
            FROM categories c
            WHERE c.id IN ({','.join(['?'] * len(category_ids))})
        '''
        category_rows = main_conn.execute(q1, list(category_ids)).fetchall()
        notebook_ids = {row['notebook_id'] for row in category_rows}
        print(f"category_rows={len(category_rows)}")
        print(f"notebook_ids={notebook_ids}")

        # ✅ 2. 匯出這些 notebooks
        if notebook_ids:
            nq = f"SELECT id, name FROM notebooks WHERE id IN ({','.join(['?'] * len(notebook_ids))})"
            notebook_rows = main_conn.execute(nq, list(notebook_ids)).fetchall()
            conn.executemany(
                'INSERT OR IGNORE INTO notebooks (id, name) VALUES (?, ?)',
                [(row['id'], row['name']) for row in notebook_rows]
            )

        # ✅ 3. 匯出這些 notebooks 之下的所有 categories（正確！）
        if notebook_ids:
            q2 = f'''
                SELECT id, name, notebook_id FROM categories
                WHERE notebook_id IN ({','.join(['?'] * len(notebook_ids))})
            '''
            cat_rows = main_conn.execute(q2, list(notebook_ids)).fetchall()
            conn.executemany(
                'INSERT OR IGNORE INTO categories (id, name, notebook_id) VALUES (?, ?, ?)',
                [(row['id'], row['name'], row['notebook_id']) for row in cat_rows]
            )

    main_conn.close()
    return jsonify({'message': 'Export success', 'filename': export_db_path.name})



@export_bp.route('/export_full', methods=['GET'])
def export_full_notebooks():
    db = get_db()

    notebooks = db.execute('SELECT id, name FROM notebooks').fetchall()
    result = []

    for nb in notebooks:
        nb_id = nb['id']

        # Categories under this notebook
        categories = db.execute("""
            SELECT id, name FROM categories WHERE notebook_id = ?
        """, (nb_id,)).fetchall()
        category_ids = [row['id'] for row in categories]

        notes = []
        if category_ids:
            placeholders = ','.join('?' for _ in category_ids)
            notes = db.execute(f"""
                SELECT tags, userid FROM notes
                WHERE category_id IN ({placeholders})
            """, category_ids).fetchall()

        # Aggregate unique tags and userids
        tag_set = set()
        user_set = set()

        for note in notes:
            try:
                tags = json.loads(note['tags']) if note['tags'] else []
                if isinstance(tags, list):
                    tag_set.update([t.strip() for t in tags if isinstance(t, str)])
            except json.JSONDecodeError:
                pass  # 忽略不合法的格式
            tag_set.update(tags)
            if note['userid']:
                user_set.add(note['userid'])

        result.append({
            'id': nb_id,
            'name': nb['name'],
            'categories': [dict(row) for row in categories],
            'tags': [{'name': tag} for tag in sorted(tag_set)],
            'users': [{'id': uid, 'name': uid} for uid in sorted(user_set)]
        })

    return jsonify(result)
    
    
@export_bp.route('/users')
def list_userids():
    return jsonify(get_distinct_userids())

@export_bp.route('/download/<filename>')
def download_file(filename):
    path = Path(filename)
    if path.exists() and path.suffix == '.db':
        return send_file(path, as_attachment=True)
    return jsonify({'error': 'File not found'}), 404
