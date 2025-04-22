// notebook.js
import { bindOnce, showDownloadSpinner, hideDownloadSpinner } from './utils.js';

export function initNoteBookHandler() {
  const addBtn = document.getElementById('addNotebookBtn');
  bindOnce(addBtn, 'click', async () => {
    const name = prompt('Enter new notebook name:');
    if (!name) return;

    const res = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (res.ok) {
      loadNotebookList();
    } else {
      alert('❌ Failed to create notebook');
    }
  });
}



// 🔄 動態載入 Notebook 清單
export function loadNotebookList() {
  fetch('/api/notebooks')
    .then(res => res.json())
    .then(notebooks => {
      const container = document.querySelector('[data-notebook-list]');
      container.innerHTML = '';

      notebooks.forEach(nb => {
        const a = document.createElement('a');
        a.href = `#notetree?notebook=${nb.id}`;
        a.className = 'text-sm flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-50 transition text-blue-700';
        a.dataset.notebookId = nb.id;
        a.innerHTML = `
          <i data-lucide="book" class="w-4 h-4 text-blue-600"></i>
          <span>${nb.name}</span>
        `;



        container.appendChild(a);
      });

      lucide.createIcons();



      const hash = window.location.hash;
      const match = hash.match(/notebook=(\d+)/) ;
      if (match) {
        const activeId = match[1];
        const all = document.querySelectorAll('[data-notebook-id]');
        all.forEach(link => {
          if (link.dataset.notebookId === activeId) {
            link.classList.add('bg-blue-100', 'font-semibold', 'rounded');
          }
        });
      }
    });
}



export function NotebookMenu() {
  let currentRightClickNotebookId = null;

  document.addEventListener('contextmenu', e => {
    const notebookEl = e.target.closest('[data-notebook-id]');
    const menu = document.getElementById('notebookContextMenu');

    if (notebookEl) {
      e.preventDefault();
      currentRightClickNotebookId = notebookEl.dataset.notebookId;
      menu.style.top = `${e.pageY}px`;
      menu.style.left = `${e.pageX}px`;
      menu.classList.remove('hidden');
    } else {
      menu.classList.add('hidden');
    }
  });

  document.addEventListener('click', () => {
    document.getElementById('notebookContextMenu')?.classList.add('hidden');
  });

	bindOnce(document.getElementById('cancelNotebookContext'), 'click', () => {
	  document.getElementById('notebookContextMenu')?.classList.add('hidden');
	});


	bindOnce(document.getElementById('deleteNotebookOption'), 'click', async () => {
	  if (!currentRightClickNotebookId) return;
	  const confirmDelete = confirm('Are you sure you want to delete this notebook? All its categories and notes will be removed.');
	  if (!confirmDelete) return;

	  const res = await fetch(`/api/notebooks/${currentRightClickNotebookId}`, { method: 'DELETE' });
	  if (res.ok) {
		alert('✅ Notebook deleted.');
		currentRightClickNotebookId = null;
		document.getElementById('notebookContextMenu').classList.add('hidden');
		loadNotebookList();
	  } else {
		const result = await res.json();
		alert(`❌ 刪除失敗：${result.error || 'Unknown error'}`);
	  }
	});

   bindOnce(document.getElementById('renameNotebookOption'), 'click', async () => {
    if (!currentRightClickNotebookId) return;
    const newName = prompt('Enter new notebook name:');
    if (!newName?.trim()) return;

    const res = await fetch(`/api/notebooks/${currentRightClickNotebookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() })
    });

    if (res.ok) {
      alert('✅ Notebook renamed');
      document.getElementById('notebookContextMenu')?.classList.add('hidden');
      loadNotebookList();
    } else {
      const result = await res.json();
      alert(`❌ Rename failed: ${result?.error || 'Unknown error'}`);
    }
  });
  
	bindOnce(document.getElementById('exportNotebookPdfOption'), 'click', async () => {
	  if (!currentRightClickNotebookId) return;

	  showDownloadSpinner();  // 顯示 spinner

	  try {
		const res = await fetch(`/api/download/notebook/${currentRightClickNotebookId}/pdf`);
		if (!res.ok) throw new Error('Download failed');

		const blob = await res.blob();
		const url = window.URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;

		// ⛑️ 從 header 讀取 filename
		const disposition = res.headers.get('Content-Disposition');
		const match = disposition && disposition.match(/filename=\"?([^\";]+)\"?/);
		const filename = match ? match[1] : `notebook_${currentRightClickNotebookId}.pdf`;

		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		window.URL.revokeObjectURL(url);

		document.getElementById('notebookContextMenu')?.classList.add('hidden');
	  } catch (err) {
		console.error('❌ Notebook PDF download failed:', err);
		alert('❌ Failed to download notebook PDF.');
	  } finally {
		hideDownloadSpinner();  // 無論成功或失敗都隱藏 spinner
	  }
	});



}
