from models.tag_model import get_all_tags
from flask import Blueprint,request, jsonify

tags_bp = Blueprint('tags', __name__, url_prefix='/api/tags')

@tags_bp.route('/', methods=['GET'])
def get_tags():
    notebook_id = request.args.get('notebook_id', type=int)
    category_id = request.args.get('category_id', type=int)
    
    tags = get_all_tags(notebook_id=notebook_id, category_id=category_id)
    return jsonify(tags)
