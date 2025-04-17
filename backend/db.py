from pathlib import Path
import sqlite3

DEFAULT_DB_PATH = Path(__file__).resolve().parent / 'notes.db'

def get_db(db_path=None):
    if db_path is None:
        db_path = DEFAULT_DB_PATH
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path=DEFAULT_DB_PATH):
    conn = get_db(db_path)
    with conn:
        # Notebooks table (新增)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS notebooks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT DEFAULT ''
            )
        ''')

        # Categories table (加 notebook_id 關聯)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                notebook_id INTEGER,
                FOREIGN KEY (notebook_id) REFERENCES notebooks(id)
            )
        ''')

        # Notes table (加 category_id 外鍵)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT,
                content TEXT,
                tags TEXT,
                category_id INTEGER,
                created_at TEXT,
                userid TEXT,
                archived INTEGER DEFAULT 0,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        ''')

        # 預設 Notebook & Categories 初始化
        existing_notebooks = conn.execute('SELECT COUNT(*) FROM notebooks').fetchone()[0]
        if existing_notebooks == 0:
            conn.execute('INSERT INTO notebooks (name) VALUES (?)', ('Default',))
            default_notebook_id = conn.execute('SELECT id FROM notebooks WHERE name = ?', ('Default',)).fetchone()[0]
            default_categories = ['Server', 'Cassandra', 'DB', 'Script', 'Linux Cmd']
            conn.executemany(
                'INSERT INTO categories (name, notebook_id) VALUES (?, ?)',
                [(cat, default_notebook_id) for cat in default_categories]
            )
            print('[✅] Default notebook & categories initialized')
    conn.close()
