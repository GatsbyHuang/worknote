// note-drag.js
import { bindOnce } from './utils.js'; 

export function init() {
  console.log('[🖱️] Drag-and-Drop Initialized');

  document.addEventListener('dragstart', (e) => {
    const note = e.target.closest('[data-note-id]');
    if (note) {
      e.dataTransfer.setData('noteId', note.dataset.noteId);
    }
  });

  document.addEventListener('dragover', (e) => {
    const li = e.target.closest('button[data-category]');
    if (li && li.closest('#sectionItems')) {
      e.preventDefault();
      li.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50');
    }
  });

  document.addEventListener('dragleave', (e) => {
    const li = e.target.closest('button[data-category]');
    if (li && li.closest('#sectionItems')) {
      li.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50');
    }
  });

  document.addEventListener('drop', async (e) => {
    const li = e.target.closest('button[data-category]');
    if (!li || !li.closest('#sectionItems')) return;

    e.preventDefault();
    const noteId = e.dataTransfer.getData('noteId');
    if (!noteId) return;

    const newCategoryId = li.dataset.category;

    try {
      const res = await fetch(`/api/notes/${noteId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: newCategoryId })
      });

      if (!res.ok) throw new Error('Update failed');

      li.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50');
      console.log(`✅ Note ${noteId} moved to category ${newCategoryId}`);

      window?.selectSection?.(newCategoryId);

    } catch (err) {
      console.error('❌ Failed to move note:', err);
      alert('❌ Failed to move note');
    }
  });
}

