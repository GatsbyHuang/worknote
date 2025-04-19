import json
from flask import Blueprint, jsonify, request

# ✅ 補上這一行初始化 Blueprint
version_bp = Blueprint('version', __name__, url_prefix='/api/version')

@version_bp.route('/get')
def get_local_version():

    with open('../version.json') as f:
        data = json.load(f)
        return jsonify({ "version": data.get("version", "0.0.0") })

