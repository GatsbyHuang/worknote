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
    notes = query_notes_by_conditions(data['tags'], data['categories'], data['userids'], data['mode'])
    return jsonify({'count': len(notes)})

@export_bp.route('/execute', methods=['POST'])
def execute_export():
    data = request.json
    notes = query_notes_by_conditions(data['tags'], data['categories'], data['userids'], data['mode'])

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    export_db_path = Path(f'notes_export{timestamp}.db')
    init_db(export_db_path)

    # 開啟匯出目的地資料庫
    conn = get_db(export_db_path)
    with conn:
        # 匯出 notes
        for note in notes:
            conn.execute('''
                INSERT INTO notes (id, title, content, tags, category, created_at, userid, archived)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                note['id'], note['title'], note['content'],
                note['tags'], note['category'], note['created_at'],
                note['userid'], note['archived']
            ))

        # 匯出 categories（從主資料庫撈取）
        main_conn = get_db()  # 預設主資料庫
        existing_categories = main_conn.execute('SELECT name FROM categories').fetchall()
        conn.executemany(
            'INSERT OR IGNORE INTO categories (name) VALUES (?)',
            [(row['name'],) for row in existing_categories]
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
