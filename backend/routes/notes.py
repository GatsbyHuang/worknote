from flask import Blueprint, jsonify, request
from models.note_model import (
    get_all_notes, get_note_by_id, create_note, delete_note,
    update_note, update_note_category
)

notes_bp = Blueprint('notes_bp', __name__)

@notes_bp.route('/', methods=['GET'])
def get_notes():
    limit = request.args.get('limit', type=int)
    tag = request.args.get('tag')
    category_id = request.args.get('category_id', type=int)
    userid = request.args.get('userid')
    notebook_id = request.args.get('notebook_id', type=int)
    include_archived = request.args.get('include_archived', '0') == '1'
    notes = get_all_notes(limit=limit, tag=tag, category_id=category_id, userid=userid, notebook_id=notebook_id,include_archived=include_archived)
    return jsonify(notes)

@notes_bp.route('/<note_id>', methods=['GET'])
def get_note(note_id):
    note = get_note_by_id(note_id)
    return jsonify(note) if note else ('Not found', 404)

@notes_bp.route('/', methods=['POST'])
def add_note():
    data = request.json
    print(data)

    userid = data.get('userid')
    note_id = create_note(data, userid)

    return jsonify({'id': note_id}), 201

@notes_bp.route('/<note_id>', methods=['PUT'])
def edit_note(note_id):
    data = request.json
    updated = update_note(note_id, data)
    if updated:
        return jsonify({'status': 'updated'})
    else:
        return ('Not found', 404)

@notes_bp.route('/<note_id>', methods=['DELETE'])
def delete_note_route(note_id):
    delete_note(note_id)
    return '', 204

@notes_bp.route('/<note_id>/category', methods=['PATCH'])
def patch_category(note_id):
    category_id = request.json.get('category_id')
    if category_id is None:
        return jsonify({'error': 'Missing category_id'}), 400

    ok = update_note_category(note_id, category_id)
    return jsonify({'success': ok})
