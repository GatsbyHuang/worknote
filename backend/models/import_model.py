import sqlite3
from db import get_db

def analyze_notes_and_categories(import_db_path):
    # 連接到匯入的 .db
    conn = sqlite3.connect(import_db_path)
    conn.row_factory = sqlite3.Row
    
    notebooks = [dict(row) for row in conn.execute('SELECT * FROM notebooks').fetchall()]
    notes = [dict(row) for row in conn.execute('SELECT * FROM notes').fetchall()]
    categories = [dict(row) for row in conn.execute('SELECT * FROM categories').fetchall()]
    conn.close()

    # 取得主資料庫現有的 notes.id 清單
    current_conn = get_db()
    existing_note_ids = {
        row['id'] for row in current_conn.execute('SELECT id FROM notes').fetchall()
    }

    conflict_ids = [note['id'] for note in notes if note['id'] in existing_note_ids]

    return {
        'notebooks':notebooks,
        'notes': notes,
        'categories': categories,
        'notebooks_count': len(notebooks),
        'note_count': len(notes),
        'category_count': len(categories),
        'conflict_count': len(conflict_ids),
        'conflict_ids': conflict_ids,
    }
def merge_notes_from_db(import_db_path, strategy='ignore'):
    data = analyze_notes_and_categories(import_db_path)
    imported_notes = data['notes']
    imported_categories = data['categories']
    imported_notebooks = data.get('notebooks', [])

    notes_merged = 0
    categories_merged = 0
    notebooks_merged = 0

    conn = get_db()
    with conn:
        # 匯入 notebooks（以 name 為唯一 key）
        for nb in imported_notebooks:
            try:
                conn.execute('INSERT OR IGNORE INTO notebooks (id, name) VALUES (?, ?)', (nb['id'], nb['name']))
                notebooks_merged += 1
            except:
                pass

        # 匯入 categories（根據 name + notebook_id 唯一）
        for cat in imported_categories:
            try:
                conn.execute('''
                    INSERT OR IGNORE INTO categories (id, name, notebook_id)
                    VALUES (?, ?, ?)
                ''', (cat['id'], cat['name'], cat.get('notebook_id')))
                categories_merged += 1
            except:
                pass

        # 匯入 notes（根據 strategy 決定）
        for note in imported_notes:
            if strategy == 'ignore':
                try:
                    conn.execute('''
                        INSERT INTO notes (id, title, content, tags, category_id, created_at, userid, archived)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        note['id'], note['title'], note['content'], note['tags'],
                        note['category_id'], note['created_at'], note['userid'], note['archived']
                    ))
                    notes_merged += 1
                except:
                    pass  # 主鍵衝突略過

            elif strategy == 'overwrite':
                conn.execute('DELETE FROM notes WHERE id = ?', (note['id'],))
                conn.execute('''
                    INSERT INTO notes (id, title, content, tags, category_id, created_at, userid, archived)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    note['id'], note['title'], note['content'], note['tags'],
                    note['category_id'], note['created_at'], note['userid'], note['archived']
                ))
                notes_merged += 1

    return {
        'notes_merged': notes_merged,
        'categories_merged': categories_merged,
        'notebooks_merged': notebooks_merged
    }
