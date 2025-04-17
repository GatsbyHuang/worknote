# routes/categories.py

from flask import Blueprint, jsonify, request
from db import get_db
import sqlite3

categories_bp = Blueprint('categories_bp', __name__, url_prefix='/api/categories')

@categories_bp.route('/', methods=['GET'])
def get_categories():
    notebook_id = request.args.get('notebook_id', type=int)
    conn = get_db()
    cur = conn.cursor()

    if notebook_id:
        rows = cur.execute('SELECT id, name FROM categories WHERE notebook_id = ? ORDER BY name ASC', (notebook_id,)).fetchall()
    else:
        rows = cur.execute('SELECT id, name FROM categories ORDER BY name ASC').fetchall()

    categories = [{'id': row['id'], 'name': row['name']} for row in rows]
    return jsonify(categories)

@categories_bp.route('/', methods=['POST'])
def add_category():
    data = request.get_json()
    name = data.get('name', '').strip()
    notebook_id = data.get('notebook_id')

    if not name or not notebook_id:
        return jsonify({'error': 'Name and notebook_id are required'}), 400

    conn = get_db()
    with conn:
        try:
            conn.execute("INSERT INTO categories (name, notebook_id) VALUES (?, ?)", (name, notebook_id))
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Category already exists'}), 409

    return jsonify({'status': 'ok', 'name': name}), 201

@categories_bp.route('/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    conn = get_db()
    with conn:
        cur = conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))
        if cur.rowcount == 0:
            return jsonify({'error': 'Category not found'}), 404

    return jsonify({'status': 'deleted', 'id': category_id}), 200
