from flask import Flask, send_from_directory
from flask_cors import CORS
from db import init_db, auto_fix_columns, get_db, DEFAULT_DB_PATH
import os
from routes.notes import notes_bp
from routes.tags import tags_bp
from routes.stats import stats_bp
from routes.categories import categories_bp
from routes.export import export_bp
from routes.imports import import_bp
from routes.notebook import notebooks_bp
from routes.version import version_bp
from routes.search import search_bp
#from routes.search_file import attachment_api

app = Flask(__name__, static_folder='../frontend', static_url_path='/')
CORS(app)

#if not DEFAULT_DB_PATH.exists():
init_db() #只會「建立不存在的資料表」，不會刪除或覆蓋

# 再補欄位（必要時才會生效）
conn = get_db()
auto_fix_columns(conn)
conn.close()

# 註冊 API blueprint
app.register_blueprint(notes_bp, url_prefix='/api/notes')
app.register_blueprint(tags_bp, url_prefix='/api/tags')
app.register_blueprint(stats_bp)
app.register_blueprint(notebooks_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(export_bp)
app.register_blueprint(import_bp)
app.register_blueprint(version_bp)
app.register_blueprint(search_bp)
#app.register_blueprint(attachment_api)


# 處理前端頁面（SPA）
@app.route('/')
@app.route('/<path:path>')
def serve_frontend(path='index.html'):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    app.run(debug=True)


