from flask import Blueprint, jsonify
import json
from flask import request

from models.search_model import (
    get_related_notes
)

search_bp = Blueprint('search_api', __name__)



@search_bp.route('/api/notes/related/<note_id>')
def related_notes_api(note_id):
    limit = request.args.get('limit', type=int)
    results = get_related_notes(note_id, limit)
    return jsonify(results)
    