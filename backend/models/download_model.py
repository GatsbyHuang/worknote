import json
from io import BytesIO
from weasyprint import HTML
from db import get_db


def get_common_pdf_styles():
    return '''
    <style>
    body { font-family: "Times New Roman", serif; font-size: 10pt; line-height: 1.2; color: #000; padding: 15px; }
    h1 { font-size: 16pt; margin-top: 40px; color: #2b6cb0; border-bottom: 1px solid #2b6cb0; padding-bottom: 3px; text-transform: uppercase; }
    h2 { font-size: 13pt; margin-top: 50px; color: #000; border-bottom: 2px solid #000; padding-bottom: 5px; text-transform: uppercase; }
    .note-title { font-size: 11pt; font-weight: bold; color: #2b6cb0; border-bottom: 1px dashed #aaa; padding-bottom: 2px; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase; }
    .note-content { font-size: 9pt; margin-bottom: 15px; }
    .note-content, .note-content * { word-wrap: break-word; word-break: break-word; white-space: normal; }
    .note-meta { font-size: 8pt; color: #555; margin-bottom: 20px; }
    pre, code { font-family: monospace; background: #f5f5f5; padding: 3px; border-radius: 3px; font-size: 8.5pt; white-space: pre-wrap; }
    .toc { page-break-after: always; }
    .toc h2 { font-size: 16pt; color: #800000; font-style: italic; margin-bottom: 15px; text-transform: uppercase; }
    .toc ul { list-style-type: none; padding-left: 0; font-size: 10pt; }
    .toc li { margin-bottom: 5px; }
    .toc .toc-category { font-weight: bold; margin-top: 8px; }
    .toc .toc-note { margin-left: 15px; }
    img { max-width: 100%; height: auto; display: block; margin: 5px auto; border: 1px solid #ccc; padding: 3px; background: #f9f9f9; }

    /* === 強化 Table 避免超出邊界 === */
    table { border-collapse: collapse; width: 100% !important; table-layout: auto; font-size: 8.5pt; word-break: break-word; }
    td, th { border: 1px solid #aaa; padding: 3px 5px; word-break: break-word; vertical-align: top; }
    th { background-color: #f0f0f0; font-weight: bold; text-align: left; }
    tr:nth-child(even) { background-color: #fafafa; }

    /* 針對 colgroup 和 col 標籤移除固定寬度 */
    colgroup col { width: auto !important; }

    strong { font-weight: bold; }
    em { font-style: italic; }
    </style>
    '''



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

    # 套用共用 CSS
    css = get_common_pdf_styles()
    html_content = f'''
    <html>
    <head>
      <meta charset="utf-8">
      {css}
    </head>
    <body>
      <h1>{title}</h1>
      <div class="note-content">{content}</div>
      <div class="note-meta">Tags: {tags} | Created: {created_at}</div>
    </body>
    </html>
    '''

    pdf_io = BytesIO()
    HTML(string=html_content).write_pdf(pdf_io)
    pdf_io.seek(0)
    return pdf_io, title


def generate_notebook_pdf(notebook_id):
    conn = get_db()

    notebook = conn.execute('SELECT name FROM notebooks WHERE id = ?', (notebook_id,)).fetchone()
    if not notebook:
        conn.close()
        return None

    notebook_name = notebook['name']

    categories = conn.execute('''
        SELECT id, name FROM categories
        WHERE notebook_id = ?
        ORDER BY name COLLATE NOCASE
    ''', (notebook_id,)).fetchall()

    notes = conn.execute('''
        SELECT id, title, content, tags, category_id, created_at
        FROM notes
        WHERE category_id IN (SELECT id FROM categories WHERE notebook_id = ?)
         AND archived = 0
        ORDER BY category_id, datetime(created_at)
    ''', (notebook_id,)).fetchall()
    conn.close()

    cat_map = {cat['id']: {'name': cat['name'], 'notes': []} for cat in categories}
    for note in notes:
        if note['category_id'] in cat_map and note['title'].lower() != 'untitled':
            cat_map[note['category_id']]['notes'].append(note)

    css = get_common_pdf_styles()
    html_parts = [
        '<html><head><meta charset="utf-8">',
        css,
        '</head><body>',
        f'<h1>{notebook_name}</h1>'
    ]

    # 目錄 Table of Contents
    html_parts.append('<div class="toc"><h2>Contents</h2><ul>')
    for idx, cat in enumerate(categories, 1):
        if not cat_map[cat['id']]['notes']:
            continue
        html_parts.append(f'<li class="toc-category">{idx}. {cat["name"]}<ul>')
        for n_idx, note in enumerate(cat_map[cat['id']]['notes'], 1):
            html_parts.append(f'<li class="toc-note">{idx}.{n_idx} {note["title"]}</li>')
        html_parts.append('</ul></li>')
    html_parts.append('</ul></div>')

    # 內容區
    for cat in categories:
        if not cat_map[cat['id']]['notes']:
            continue
        html_parts.append('<div style="page-break-before: always;"></div>')
        html_parts.append(f'<h2>{cat["name"]}</h2>')
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
