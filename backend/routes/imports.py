from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from models.import_model import (
    analyze_notes_and_categories,merge_notes_from_db
)
from pathlib import Path
import tempfile

import_bp = Blueprint('import', __name__, url_prefix='/api/import')
@import_bp.route('/analyze', methods=['POST'])
def analyze_import_old():
    if 'dbfile' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    dbfile = request.files['dbfile']
    if dbfile.filename == '':
        return jsonify({'error': 'Invalid filename'}), 400

    filename = secure_filename(dbfile.filename)
    temp_path = Path(tempfile.gettempdir()) / filename
    dbfile.save(temp_path)

    try:
        result = analyze_notes_and_categories(temp_path)
        return jsonify(result)
    finally:
        temp_path.unlink(missing_ok=True)  # 清除 temp file
        
        

def analyze_import():
    # 從匯入資料庫分析資料
    imported_info = analyze_notes_and_categories(import_db_path)
    imported_notes = imported_info['notes']
    imported_categories = imported_info['categories']

    # 從系統資料庫撈出現有的 note.id 用來檢查衝突
    current_conn = get_db()
    existing_note_ids = {
        row['id'] for row in current_conn.execute('SELECT id FROM notes').fetchall()
    }

    # 找出衝突的筆記 ID
    conflict_ids = [note['id'] for note in imported_notes if note['id'] in existing_note_ids]

    # 回傳分析統計資料與細節
    return {
        'note_count': len(imported_notes),
        'category_count': len(imported_categories),
        'conflict_count': len(conflict_ids),
        'conflict_ids': conflict_ids,
        'notes': imported_notes,
        'categories': imported_categories,
    }
    
@import_bp.route('/merge', methods=['POST'])
def merge_import():
    if 'dbfile' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    dbfile = request.files['dbfile']
    strategy = request.form.get('strategy', 'ignore')
    if dbfile.filename == '':
        return jsonify({'error': 'Invalid filename'}), 400

    filename = secure_filename(dbfile.filename)
    temp_path = Path(tempfile.gettempdir()) / filename
    dbfile.save(temp_path)

    try:
        result = merge_notes_from_db(temp_path, strategy)
        return jsonify(result)
    finally:
        temp_path.unlink(missing_ok=True)
