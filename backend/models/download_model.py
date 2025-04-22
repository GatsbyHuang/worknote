import json
from io import BytesIO
from weasyprint import HTML
from db import get_db

def generate_note_pdf(note_id):
    conn = get_db()
    note = conn.execute('SELECT title, content, tags, created_at FROM notes WHERE id = ?', (note_id,)).fetchone()
    conn.close()

    if not note:
        return None  # 由 route 處理 404 或錯誤訊息

    title = note['title'] or 'Untitled'
    content = note['content'] or ''
    try:
        tags = ', '.join(json.loads(note['tags'] or '[]'))
    except json.JSONDecodeError:
        tags = ''
    created_at = note['created_at']

    # HTML 模板（與 Notebook PDF 統一樣式）
    html_content = f'''
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: "Helvetica", sans-serif; padding: 40px; line-height: 1.6; color: #333; }}
        h1 {{ font-size: 32px; color: #2b6cb0; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px; margin-bottom: 30px; }}
        .note-content {{ margin-bottom: 40px; }}
        .note-meta {{ font-size: 12px; color: #666; margin-top: 20px; }}
        img {{ max-width: 100%; height: auto; }}
        table {{ border-collapse: collapse; width: 100%; margin-top: 20px; }}
        td, th {{ border: 1px solid #ccc; padding: 8px; }}
      </style>
    </head>
    <body>
      <h1>{title}</h1>
      <div class="note-content">{content}</div>
      <div class="note-meta">Tags: {tags} | Created: {created_at}</div>
    </body>
    </html>
    '''

    # 轉成 PDF 並回傳 BytesIO
    pdf_io = BytesIO()
    HTML(string=html_content).write_pdf(pdf_io)
    pdf_io.seek(0)

    return pdf_io, title


def generate_notebook_pdf(notebook_id):
    conn = get_db()

    # Step 1: 取出該 notebook 名稱
    notebook = conn.execute('SELECT name FROM notebooks WHERE id = ?', (notebook_id,)).fetchone()
    if not notebook:
        conn.close()
        return None

    notebook_name = notebook['name']

    # Step 2: 撈出所有 categories（依名稱排序）
    categories = conn.execute('''
        SELECT id, name FROM categories
        WHERE notebook_id = ?
        ORDER BY name COLLATE NOCASE
    ''', (notebook_id,)).fetchall()

    # Step 3: 撈出所有 notes，依 category、created_at 排序
    notes = conn.execute('''
        SELECT id, title, content, tags, category_id, created_at
        FROM notes
        WHERE category_id IN (SELECT id FROM categories WHERE notebook_id = ?)
        ORDER BY category_id, datetime(created_at)
    ''', (notebook_id,)).fetchall()
    conn.close()

    # Step 4: 先建立 category->notes 的 map，排除 'Untitled'
    cat_map = {cat['id']: {'name': cat['name'], 'notes': []} for cat in categories}
    for note in notes:
        if note['category_id'] in cat_map and note['title'].lower() != 'untitled':
            cat_map[note['category_id']]['notes'].append(note)

    # Step 5: 建立 HTML 文件
    html_parts = [
        '<html><head><meta charset="utf-8"><style>',
        'body { font-family: Helvetica, sans-serif; padding: 40px; line-height: 1.6; color: #333; }',
        'h1 { font-size: 32px; margin-top: 60px; color: #5e4fa2; border-bottom: 2px solid #5e4fa2; padding-bottom: 10px; }',
        'h2 { font-size: 26px; margin-top: 60px; color: #444; border-bottom: 1px solid #ccc; padding-bottom: 5px; }',
        'h2.content-category { font-size: 26px; margin-top: 60px; color: #2b6cb0; border-bottom: 1px solid #ccc; padding-bottom: 5px; }',
        '.note-title { font-size: 20px; margin-top: 30px; font-weight: bold; color: #222; }',
        '.note-content { margin-bottom: 20px; }',
        '.note-content, .note-content * { word-wrap: break-word; word-break: break-word; white-space: normal; }',
        '.note-meta { font-size: 12px; color: #666; margin-bottom: 40px; }',
        'pre, code { font-family: monospace; background: #f5f5f5; padding: 5px; border-radius: 4px; }',
        '.toc { page-break-after: always; }',
        '.toc h2 { font-size: 24px; color: #555; }',
        '.toc ul { list-style-type: none; padding-left: 0; }',
        '.toc li { margin-bottom: 5px; }',
        'img { max-width: 100%; height: auto; display: block; margin: 10px auto; border: 1px solid #ccc; padding: 5px; background: #f9f9f9; }',
        'table { border-collapse: collapse; width: 100%; table-layout: fixed; word-break: break-word; }',
        'td, th { border: 1px solid #ccc; padding: 8px; word-break: break-word; }',
        'th { background-color: #f0f0f0; font-weight: bold; text-align: left; }',
        'tr:nth-child(even) { background-color: #fafafa; }',
        '</style></head><body>'
    ]

    # Step 6: 產生目錄頁（Table of Contents）
    html_parts.append(f'<h1>{notebook_name}</h1>')
    html_parts.append('<div class="toc"><h2>目錄 Table of Contents</h2><ul>')
    for cat in categories:
        if not cat_map[cat['id']]['notes']:
            continue  # 若無 notes，略過
        html_parts.append(f'<li><strong>{cat["name"]}</strong><ul>')
        count = 1
        for note in cat_map[cat['id']]['notes']:
            html_parts.append(f'<li>{count}. {note["title"]}</li>')
            count += 1
        html_parts.append('</ul></li>')
    html_parts.append('</ul></div>')

    # Step 7: 實際筆記內容（每個 Category 換頁）
    for cat in categories:
        if not cat_map[cat['id']]['notes']:
            continue  # 若無 notes，略過
        html_parts.append('<div style="page-break-before: always;"></div>')
        html_parts.append(f'<h2 class="content-category">{cat["name"]}</h2>')
        count = 1
        for note in cat_map[cat['id']]['notes']:
            tags = ', '.join(json.loads(note['tags'] or '[]'))
            html_parts.append(f'<div class="note-title">{count}. {note["title"]}</div>')
            html_parts.append(f'<div class="note-content">{note["content"]}</div>')
            html_parts.append(f'<div class="note-meta">Tags: {tags} | Created: {note["created_at"]}</div>')
            count += 1

    html_parts.append('</body></html>')

    html_string = '\n'.join(html_parts)
    pdf_io = BytesIO()
    HTML(string=html_string).write_pdf(pdf_io)
    pdf_io.seek(0)

    return pdf_io, notebook_name
