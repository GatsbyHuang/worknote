// note-drag.js

export function init() {
  console.log('[🖱️] Drag-and-Drop Initialized');

  document.addEventListener('dragstart', (e) => {
    if (e.target.matches('[data-note-id]')) {
      e.dataTransfer.setData('noteId', e.target.dataset.noteId);
    }
  });

  document.querySelectorAll('#sectionItems').forEach(list => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const li = e.target.closest('li[data-category]');
      li?.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50');
    });

    list.addEventListener('dragleave', (e) => {
      const li = e.target.closest('li[data-category]');
      li?.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50');
    });

    list.addEventListener('drop', async (e) => {
      e.preventDefault();
      const noteId = e.dataTransfer.getData('noteId');
      const li = e.target.closest('li[data-category]');
      if (!noteId || !li) return;

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

        // 強制 reload 該分類筆記
        window?.selectSection?.(newCategoryId);

      } catch (err) {
        console.error('❌ Failed to move note:', err);
        alert('❌ Failed to move note');
      }
    });
  });
}
