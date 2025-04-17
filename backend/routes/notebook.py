from flask import Blueprint, jsonify, request
from models.notebook_model import (
    fetch_all_notebooks,
    create_notebook,
    update_notebook_by_id,
    delete_notebook_by_id
)

notebooks_bp = Blueprint('notebooks_bp', __name__, url_prefix='/api/notebooks')

@notebooks_bp.route('/', methods=['GET'])
def get_notebooks():
    notebooks = fetch_all_notebooks()
    return jsonify(notebooks)

@notebooks_bp.route('/', methods=['POST'])
def add_notebook():
    result = create_notebook(request.get_json())
    return jsonify(result['body']), result['status']

@notebooks_bp.route('/<int:notebook_id>', methods=['PUT'])
def update_notebook(notebook_id):
    result = update_notebook_by_id(notebook_id, request.get_json())
    return jsonify(result['body']), result['status']

@notebooks_bp.route('/<int:notebook_id>', methods=['DELETE'])
def delete_notebook(notebook_id):
    result = delete_notebook_by_id(notebook_id)
    return jsonify(result['body']), result['status']
