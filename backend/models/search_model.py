import json
import sqlite3
from db import get_db


STOP_WORDS = {'for', 'the', 'and', 'of', 'to', 'in', 'on', 'at', 'by', 'a', 'an', 'is', 'with'}


def get_related_notes(note_id, limit=None):
    conn = get_db()

    # Step 1: 取得當前 note 的 title 和 tags
    note = conn.execute('SELECT title, tags FROM notes WHERE id = ?', (note_id,)).fetchone()
    if not note:
        return []

    title = note['title'] or ''
    try:
        tags = json.loads(note['tags']) if note['tags'] else []
    except json.JSONDecodeError:
        tags = []

    # Step 2: 拆分 title 成 tokens 並過濾停止詞
    tokens = [word for word in title.lower().split() if word not in STOP_WORDS]

    # Step 3: 先用 tags 搜尋至少有一個相同 tag 的 notes
    if not tags or not tokens:
        return []

    query = f'''
        SELECT id, title, tags, created_at FROM notes
        WHERE id != ?
        AND (
            {' OR '.join([f'tags LIKE ?' for _ in tags])}
        )
        ORDER BY datetime(created_at) DESC
    '''
    tag_params = [f'%{tag}%' for tag in tags]
    candidates = conn.execute(query, (note_id, *tag_params)).fetchall()

    # Step 4: 比對 title tokens
    results = []
    for cand in candidates:
        cand_title = cand['title'].lower() if cand['title'] else ''
        if any(token in cand_title for token in tokens):
            results.append({
                'id': cand['id'],
                'title': cand['title'],
                'tags': cand['tags'],
                'created_at': cand['created_at']
            })

    # Step 5: 套用 limit（若有）
    if limit is not None:
        results = results[:limit]

    conn.close()
    return results
