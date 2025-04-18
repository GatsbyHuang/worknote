from flask import Blueprint, jsonify, request
from pathlib import Path
from datetime import datetime
from db import init_db, get_db
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

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    export_db_path = Path(f'notes_export{timestamp}.db')
    init_db(export_db_path)

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

        # ✅ 匯出對應的 categories
        category_ids = {note['category_id'] for note in notes if note['category_id']}
        if category_ids:
            q = f"SELECT id, name, notebook_id FROM categories WHERE id IN ({','.join(['?'] * len(category_ids))})"
            rows = main_conn.execute(q, list(category_ids)).fetchall()
            conn.executemany(
                'INSERT OR IGNORE INTO categories (id, name, notebook_id) VALUES (?, ?, ?)',
                [(row['id'], row['name'], row['notebook_id']) for row in rows]
            )

        # ✅ 匯出對應的 categories（保持原本邏輯）
        category_ids = {note['category_id'] for note in notes if note['category_id']}
        if category_ids:
            q = f"SELECT id, name, notebook_id FROM categories WHERE id IN ({','.join(['?'] * len(category_ids))})"
            category_rows = main_conn.execute(q, list(category_ids)).fetchall()
            conn.executemany(
                'INSERT OR IGNORE INTO categories (id, name, notebook_id) VALUES (?, ?, ?)',
                [(row['id'], row['name'], row['notebook_id']) for row in category_rows]
            )

            # ✅ 從 category rows 中取出 notebook_id 再查 notebooks
            notebook_ids = {row['notebook_id'] for row in category_rows if row['notebook_id']}
            if notebook_ids:
                nq = f"SELECT id, name FROM notebooks WHERE id IN ({','.join(['?'] * len(notebook_ids))})"
                notebook_rows = main_conn.execute(nq, list(notebook_ids)).fetchall()
                conn.executemany(
                    'INSERT OR IGNORE INTO notebooks (id, name) VALUES (?, ?)',
                    [(row['id'], row['name']) for row in notebook_rows]
                )


    main_conn.close()
    return jsonify({'message': 'Export success', 'filename': export_db_path.name})


@export_bp.route('/users')
def list_userids():
    return jsonify(get_distinct_userids())

@export_bp.route('/download/<filename>')
def download_file(filename):
    path = Path(filename)
    if path.exists() and path.suffix == '.db':
        return send_file(path, as_attachment=True)
    return jsonify({'error': 'File not found'}), 404
