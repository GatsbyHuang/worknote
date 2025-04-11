from db import get_db
from typing import List

def query_notes_by_conditions(tags: List[str], categories: List[str], userids: List[str], mode: str, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()

    where_clauses = []
    values = []

    def build_clause(field, values_list):
        if not values_list:
            return None
        if mode == 'all':
            return ' AND '.join([f"{field} LIKE ?" for _ in values_list]), [f"%{v}%" for v in values_list]
        else:  # 'any'
            return ' OR '.join([f"{field} LIKE ?" for _ in values_list]), [f"%{v}%" for v in values_list]

    tag_clause, tag_vals = build_clause('tags', tags) if tags else (None, [])
    cat_clause, cat_vals = build_clause('category', categories) if categories else (None, [])
    user_clause, user_vals = build_clause('userid', userids) if userids else (None, [])

    for clause, vals in [(tag_clause, tag_vals), (cat_clause, cat_vals), (user_clause, user_vals)]:
        if clause:
            where_clauses.append(f"({clause})")
            values.extend(vals)

    if mode == 'all':
        where_sql = ' AND '.join(where_clauses)
    else:
        where_sql = ' OR '.join(where_clauses)

    query = f"SELECT * FROM notes WHERE archived = 0"
    if where_sql:
        query += f" AND ({where_sql})"
    
    print(query)
    cursor.execute(query, values)
    result = cursor.fetchall()
    conn.close()
    return result

def get_distinct_userids():
    conn = get_db()
    rows = conn.execute('SELECT DISTINCT userid FROM notes WHERE userid IS NOT NULL').fetchall()
    return [row['userid'] for row in rows if row['userid']]
