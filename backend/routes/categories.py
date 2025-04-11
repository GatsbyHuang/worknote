# routes/categories.py

from flask import Blueprint, jsonify, request  # ← 修正點
from db import get_db
import sqlite3  # ← 因為你有用到 sqlite3.IntegrityError

categories_bp = Blueprint('categories_bp', __name__, url_prefix='/api/categories')

@categories_bp.route('/', methods=['GET'])
def get_categories():
    conn = get_db()
    cur = conn.cursor()
    rows = cur.execute('SELECT name FROM categories ORDER BY name ASC').fetchall()
    categories = [row['name'] for row in rows]
    return jsonify(categories)

@categories_bp.route('/', methods=['POST'])
def add_category():
    data = request.get_json()
    name = data.get('name', '').strip()

    if not name:
        return jsonify({'error': 'Name is required'}), 400

    conn = get_db()
    with conn:
        try:
            conn.execute("INSERT INTO categories (name) VALUES (?)", (name,))
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Category already exists'}), 409

    return jsonify({'status': 'ok', 'name': name}), 201


@categories_bp.route('/<name>', methods=['DELETE'])
def delete_category(name):
    if not name:
        return jsonify({'error': 'Missing category name'}), 400

    conn = get_db()
    with conn:
        cur = conn.execute("DELETE FROM categories WHERE name = ?", (name,))
        if cur.rowcount == 0:
            return jsonify({'error': 'Category not found'}), 404

    return jsonify({'status': 'deleted', 'name': name}), 200
