from db import get_db
from typing import List

def query_notes_by_conditions(
    tags: List[str],
    categories: List[str],
    userids: List[str],
    notebooks: List[str],
    mode: str,
    db_path=None
):
    conn = get_db(db_path)
    cursor = conn.cursor()

    where_clauses = []
    values = []
    
    print(f"tags:{tags}")
    print(f"categories:{categories}")
    print(f"userids:{userids}")
    print(f"notebooks:{notebooks}")
    print(f"mode:{mode}")
    
    def build_clause(field, values_list):
        if not values_list:
            return None, []
        #inside one critiera, ex: tag, user, categories, always use OR
        return ' OR '.join([f"{field} LIKE ?" for _ in values_list]), [f"%{v}%" for v in values_list]
    
    def build_in_clause(field, values_list):
        if not values_list:
            return None, []
        placeholders = ','.join(['?' for _ in values_list])
        return f"{field} IN ({placeholders})", values_list
        
    tag_clause, tag_vals = build_clause('n.tags', tags)
    cat_clause, cat_vals = build_clause('c.id', categories)
    user_clause, user_vals = build_clause('n.userid', userids)
    notebook_clause, notebook_vals = build_in_clause('nb.id', notebooks)

    for clause, vals in [(tag_clause, tag_vals), (cat_clause, cat_vals), (user_clause, user_vals), (notebook_clause, notebook_vals)]:
        if clause:
            where_clauses.append(f"({clause})")
            values.extend(vals)

    if mode == 'all':
        where_sql = ' AND '.join(where_clauses)
    else:
        where_sql = ' OR '.join(where_clauses)

    # ✅ 這裡做 LEFT JOIN，把欄位定義出來
    query = """
        SELECT n.*, c.name AS category_name, nb.name AS notebook_name
        FROM notes n
        LEFT JOIN categories c ON n.category_id = c.id
        LEFT JOIN notebooks nb ON c.notebook_id = nb.id
        WHERE n.archived = 0
    """

    if where_sql:
        query += f" AND ({where_sql})"

    print('[🔍] Final SQL:', query)
    print('[📦] Params:', values)

    cursor.execute(query, values)
    result = cursor.fetchall()
    conn.close()
    return result


def get_distinct_userids():
    conn = get_db()
    rows = conn.execute('SELECT DISTINCT userid FROM notes WHERE userid IS NOT NULL').fetchall()
    return [row['userid'] for row in rows if row['userid']]
