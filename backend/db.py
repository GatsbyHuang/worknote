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
        conn.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT,
                content TEXT,
                tags TEXT,
                category TEXT,
                created_at TEXT,
                userid TEXT,
                archived INTEGER DEFAULT 0
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        ''')

        existing = conn.execute('SELECT COUNT(*) FROM categories').fetchone()[0]
        if existing == 0:
            default_categories = ['Server', 'Cassandra', 'DB', 'Script', 'Linux Cmd']
            conn.executemany('INSERT INTO categories (name) VALUES (?)', [(cat,) for cat in default_categories])
            print('[✅] Categories initialized')
    conn.close()
