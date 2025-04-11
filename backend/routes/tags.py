from flask import Blueprint, jsonify
from models.tag_model import get_all_tags

tags_bp = Blueprint('tags', __name__, url_prefix='/api/tags')

@tags_bp.route('/', methods=['GET'])
def get_tags():
    tags = get_all_tags()
    return jsonify(tags)
