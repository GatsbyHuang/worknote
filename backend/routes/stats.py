from flask import Blueprint, jsonify

from models.stats_model import (
    get_dashboard_stats,get_notebook_stats
)
stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/api/dashboard')
def stats():
    return jsonify(get_dashboard_stats())

@stats_bp.route('/api/notebook_stats', methods=['GET'])
def notebook_stats():
    try:
        stats = get_notebook_stats();
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500