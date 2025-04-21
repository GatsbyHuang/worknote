from pathlib import Path
import sqlite3

DEFAULT_DB_PATH = Path(__file__).resolve().parent / 'notes.db'


EXPECTED_SCHEMAS = {
    'notes': [
        'id TEXT PRIMARY KEY',
        'title TEXT',
        'content TEXT',
        'tags TEXT',
        'category_id INTEGER',
        'created_at TEXT',
        'updated_at TEXT',
        'userid TEXT',
        'archived INTEGER DEFAULT 0'
    ],
    'categories': [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'name TEXT NOT NULL',
        'notebook_id INTEGER'
    ],
    'notebooks': [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'name TEXT UNIQUE NOT NULL',
        'description TEXT DEFAULT \'\''
    ]
}


def get_db(db_path=None):
    if db_path is None:
        db_path = DEFAULT_DB_PATH
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path=DEFAULT_DB_PATH, with_defaults=True):
    conn = get_db(db_path)
    with conn:
        # Notebooks table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS notebooks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT DEFAULT ''
            )
        ''')

        # Categories table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                notebook_id INTEGER,
                FOREIGN KEY (notebook_id) REFERENCES notebooks(id)
            )
        ''')

        # Notes table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT,
                content TEXT,
                tags TEXT,
                category_id INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                userid TEXT,
                archived INTEGER DEFAULT 0,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        ''')

        # 自動補欄位
        auto_fix_columns(conn)

        # ✅ 預設資料（可選）
        if with_defaults:
            existing_notebooks = conn.execute('SELECT COUNT(*) FROM notebooks').fetchone()[0]
            if existing_notebooks == 0:
                conn.execute('INSERT INTO notebooks (name) VALUES (?)', ('Default',))
                default_notebook_id = conn.execute(
                    'SELECT id FROM notebooks WHERE name = ?', ('Default',)
                ).fetchone()[0]
                default_categories = ['Server', 'Cassandra', 'DB', 'Script', 'Linux Cmd']
                conn.executemany(
                    'INSERT INTO categories (name, notebook_id) VALUES (?, ?)',
                    [(cat, default_notebook_id) for cat in default_categories]
                )
                print('[✅] Default notebook & categories initialized')

    conn.close()


def auto_fix_columns(conn):
    for table, expected_cols in EXPECTED_SCHEMAS.items():
        cur = conn.execute(f"PRAGMA table_info({table})")
        existing_cols = {row[1] for row in cur.fetchall()}

        for col_def in expected_cols:
            col_name = col_def.split()[0]
            if col_name not in existing_cols:
                print(f"🛠️ Adding column '{col_name}' to table '{table}'")
                try:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
                except sqlite3.OperationalError as e:
                    print(f"❌ Failed to add column {col_name} to {table}: {e}")

