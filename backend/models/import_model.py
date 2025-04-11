import sqlite3
from db import get_db

def analyze_notes_and_categories(import_db_path):
    # 連接到匯入的 .db
    conn = sqlite3.connect(import_db_path)
    conn.row_factory = sqlite3.Row

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
        'notes': notes,
        'categories': categories,
        'note_count': len(notes),
        'category_count': len(categories),
        'conflict_count': len(conflict_ids),
        'conflict_ids': conflict_ids,
    }

def merge_notes_from_db(import_db_path, strategy='ignore'):
    data = analyze_notes_and_categories(import_db_path)
    imported_notes = data['notes']
    imported_categories = data['categories']

    notes_merged = 0
    categories_merged = 0

    conn = get_db()
    with conn:
        # 匯入分類：只新增不覆蓋（UNIQUE）
        for cat in imported_categories:
            try:
                conn.execute('INSERT OR IGNORE INTO categories (name) VALUES (?)', (cat['name'],))
                categories_merged += 1
            except:
                pass  # 忽略錯誤

        # 匯入筆記
        for note in imported_notes:
            if strategy == 'ignore':
                # 插入失敗（主鍵重複）則跳過
                try:
                    conn.execute('''
                        INSERT INTO notes (id, title, content, tags, category, created_at, userid, archived)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        note['id'], note['title'], note['content'], note['tags'],
                        note['category'], note['created_at'], note['userid'], note['archived']
                    ))
                    notes_merged += 1
                except:
                    pass  # 衝突則略過

            elif strategy == 'overwrite':
                # 先刪再插入
                conn.execute('DELETE FROM notes WHERE id = ?', (note['id'],))
                conn.execute('''
                    INSERT INTO notes (id, title, content, tags, category, created_at, userid, archived)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    note['id'], note['title'], note['content'], note['tags'],
                    note['category'], note['created_at'], note['userid'], note['archived']
                ))
                notes_merged += 1

    return {
        'notes_merged': notes_merged,
        'categories_merged': categories_merged
    }