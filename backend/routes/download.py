from flask import Blueprint, send_file, abort
from models.download_model import generate_note_pdf, generate_notebook_pdf

download_bp = Blueprint('download', __name__, url_prefix='/api/download')

@download_bp.route('/<note_id>/pdf', methods=['GET'])
def download_note_pdf(note_id):
    pdf_io, title = generate_note_pdf(note_id)
    if not pdf_io:
        return abort(404, 'Note not found')
    filename = f"{title}_{note_id}.pdf"
    return send_file(pdf_io, download_name=filename, as_attachment=True, mimetype='application/pdf')


@download_bp.route('/notebook/<int:notebook_id>/pdf', methods=['GET'])
def download_notebook_pdf(notebook_id):
    pdf_io,notebook_name = generate_notebook_pdf(notebook_id)
    if not pdf_io:
        return abort(404, 'Notebook not found')
    filename = f"notebook_{notebook_name}_{notebook_id}.pdf"
    print(filename)
    return send_file(pdf_io, download_name=filename, as_attachment=True, mimetype='application/pdf')
