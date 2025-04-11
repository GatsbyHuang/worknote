from flask import Blueprint, jsonify
from models.stats_model import get_dashboard_stats

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/api/dashboard')
def stats():
    return jsonify(get_dashboard_stats())
