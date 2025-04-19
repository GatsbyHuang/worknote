from flask import Blueprint, jsonify
from pathlib import Path
from docx import Document
from pptx import Presentation
import fitz  # PyMuPDF
import json
from models.file_search_model import (
    extract_text_from_file,index_attachments
)

attachment_api = Blueprint('attachment_api', __name__)
ATTACHMENT_ROOT = Path('attachments')
INDEX_PATH = Path('attachment_index.json')



from flask import request

@attachment_api.route('/api/reindex_attachments', methods=['GET'])
def reindex_attachments():
    try:
        # 允許前端傳參數（如 path 或是否儲存）
        data = request.get_json(silent=True) or {}
        root_dir = data.get('root_dir', 'attachments')
        save_path = data.get('save_path', 'attachment_index.json')
        print_summary = data.get('print_summary', False)

        index = index_attachments(root_dir=root_dir, save_path=save_path, print_summary=print_summary)

        return jsonify({
            'success': True,
            'indexed_files': len(index),
            'index_preview': index[:3]  # 可選：預覽前幾筆資料
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
