// notetree.js - for note-browser.html
import { bindOnce, showDownloadSpinner, hideDownloadSpinner,updateHashParam,showToast  } from './utils.js';

let currentCategory = null;
let currentNotebookId = null;
let currentRightClickNoteId = null;
let currentRightClickCategory = null;
let currentRightClickCategoryName = null;
let noteTreeReady = false;
let preview = null;  

export async function init() {
  console.log('🧭 Note Browser Page Loaded');

  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  currentNotebookId = params.get('notebook');
  const preloadNoteId = sessionStorage.getItem('currentNoteId');
  const preloadCategoryId = params.get('category');

  if (preloadCategoryId) {
	sessionStorage.setItem('currentCategoryId', preloadCategoryId);  // ✅ 記錄 category
   }
  await import('./notetree-drag.js').then(m => m.init());
  preview = await import('./notetree-preview.js');


  onDocReady();
  await loadCategories(preloadCategoryId, preloadNoteId);
  setupContextMenu();
  setupButtonEvents();
}

function onDocReady(){
      console.log("initi notetree ondocument ready")
      safeLucideRefresh();
	  //setupDragDrop();
}

function safeLucideRefresh() {
  if (window.lucide?.createIcons) {
    lucide.createIcons();
  }
}

function setupButtonEvents() {
  // --- Add Category ---
	const sectionBtn = document.getElementById('addSectionBtn');

	if (window.__addSectionHandler__) {
	  sectionBtn?.removeEventListener('click', window.__addSectionHandler__);
	}
	const addSectionHandler = async () => {
	  const name = prompt('New category name?');
	  if (!name || !currentNotebookId) return;

	  const res = await fetch('/api/categories', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, notebook_id: currentNotebookId })
	  });

	  if (res.ok) {
		await loadCategories();
        showToast('category.add', 'add', name);      // ✨ Category "xxx" created!
	  } else {
		alert('❌ Failed to add category');
	  }
	};
	sectionBtn?.addEventListener('click', addSectionHandler);
	window.__addSectionHandler__ = addSectionHandler;

  // --- Add Note ---
  const addBtn = document.getElementById('addNoteBtn');

  // 如果已綁定過，先解除
  if (window.__addNoteHandler__) {
    addBtn?.removeEventListener('click', window.__addNoteHandler__);
  }

  // 建立新的 handler 並綁定
  const addNoteHandler = async () => {
    console.log('[➕] Add Note');
    if (!currentCategory) {
      alert('⚠️ Please select a category first');
      return;
    }

    const payload = {
      title: 'Untitled',
      content: '',
      tags: [],
      category_id: currentCategory,
      created_at: new Date().toISOString(),
      userid: localStorage.getItem('userId')
    };

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    const newNoteId = data.id;
    sessionStorage.setItem('currentNoteId', newNoteId);

    await selectSection(currentCategory);
    showToast('note.add', 'add', 'Untitled');
    
    const newNoteEl = document.querySelector(`[data-note-id="${newNoteId}"]`);
    if (newNoteEl) {
      setActiveNote(newNoteId);
      newNoteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const noteDetail = await fetchNoteDetail(newNoteId);
      await showPrevEditor(noteDetail);
    }
  };

  addBtn?.addEventListener('click', addNoteHandler);
  window.__addNoteHandler__ = addNoteHandler;
  
  
	 // --- Download Note ---
	const downloadBtn = document.getElementById('downloadNoteBtn');
	if (window.__downloadNoteHandler__) {
	  downloadBtn?.removeEventListener('click', window.__downloadNoteHandler__);
	}

	const downloadNoteHandler = async () => {
	  const noteId = sessionStorage.getItem('currentNoteId');
	  if (!noteId) {
		alert('❗ Please select a note first!');
		return;
	  }

	  showDownloadSpinner();  // 顯示 spinner

	  try {
		const res = await fetch(`/api/download/${noteId}/pdf`);
		if (!res.ok) throw new Error('Download failed');

		const blob = await res.blob();
		const url = window.URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;

		const disposition = res.headers.get('Content-Disposition');
		const match = disposition && disposition.match(/filename=\"?([^\";]+)\"?/);
		const filename = match ? match[1] : `note_${noteId}.pdf`;

		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		window.URL.revokeObjectURL(url);
	  } catch (err) {
		console.error('❌ Download note failed:', err);
		alert('❌ Failed to download note.');
	  } finally {
		hideDownloadSpinner();  // 隱藏 spinner
	  }
	};

	downloadBtn?.addEventListener('click', downloadNoteHandler);
	window.__downloadNoteHandler__ = downloadNoteHandler;
  
}


async function loadCategories(preloadCategoryId = null, preloadNoteId = null) {
  if (!currentNotebookId) return;
  const res = await fetch(`/api/categories?notebook_id=${currentNotebookId}`);
  const categories = await res.json();

	const sectionList = document.getElementById('sectionItems');
	sectionList.innerHTML = '';

	categories.forEach(cat => {
	  const tab = document.createElement('button');
	  tab.textContent = cat.name;
	  tab.dataset.category = cat.id;
		tab.className =
		  'px-3 py-1 rounded-full text-sm transition whitespace-nowrap border' +
		  (String(cat.id) === String(currentCategory)
			? ' bg-blue-100 text-blue-700 border-blue-400 font-semibold ring-1 ring-blue-200'
			: ' text-gray-700 bg-blue-100 hover:bg-blue-100 hover:text-blue-600 border border-transparent');

	  tab.addEventListener('click', () => {
		setActiveSection(cat.id);
		selectSection(cat.id);

	  });

	  tab.addEventListener('dragover', e => {
		e.preventDefault();
		tab.classList.add('ring-2', 'ring-blue-400');
	  });

	  tab.addEventListener('dragleave', () => {
		tab.classList.remove('ring-2', 'ring-blue-400');
	  });

	  tab.addEventListener('drop', async e => {
		e.preventDefault();
		tab.classList.remove('ring-2', 'ring-blue-400');

		const noteId = e.dataTransfer.getData('text/plain');
		if (!noteId) return;

		const res = await fetch(`/api/notes/${noteId}/category`, {
		  method: 'PATCH',
		  headers: { 'Content-Type': 'application/json' },
		  body: JSON.stringify({ category_id: cat.id })
		});

		if (res.ok) {
		  console.log(`✅ Note ${noteId} moved to ${cat.name}`);
		  setActiveSection(cat.id);
		  selectSection(cat.id);
		} else {
		  alert('❌ Failed to move note');
		}
	  });

	  sectionList.appendChild(tab);
	});


  if (preloadCategoryId) {
	  await selectSection(preloadCategoryId, preloadNoteId);
	} else if (categories[0]) {
	  await selectSection(categories[0].id);
	}

  noteTreeReady = true;

}

function setActiveSection(categoryId) {
  currentCategory = categoryId;
  const all = document.querySelectorAll('#sectionItems button');
  all.forEach(btn => {
    btn.classList.remove(
      'bg-white',
      'shadow',
      'text-blue-700',
      'border-blue-300',
      'font-semibold'
    );
    btn.classList.add(
      'text-gray-700',
      'bg-gray-100',
      'hover:bg-blue-100',
      'hover:text-blue-600',
      'border-transparent'
    );
  });

  const active = [...all].find(btn => btn.dataset.category === String(categoryId));
  if (active) {
    active.classList.remove(
      'text-gray-700',
      'bg-gray-100',
      'hover:bg-blue-100',
      'hover:text-blue-600',
      'border-transparent'
    );
    active.classList.add(
      'bg-white',
      'shadow',
      'text-blue-700',
      'border-blue-300',
      'font-semibold'
    );
  }
}


function setActiveNote(noteId) {
  const all = document.querySelectorAll('#noteList li');
  all.forEach(li => li.classList.remove('bg-blue-100', 'text-blue-700', 'font-semibold', 'ring'));
  const match = [...all].find(li => li.dataset.noteId === noteId);
  if (match) match.classList.add('bg-blue-100', 'text-blue-700', 'font-semibold', 'ring');
}

async function selectSection(categoryId, noteToSelect = null) {
  currentCategory = categoryId;
  sessionStorage.setItem('currentCategoryId', categoryId);
    // ✅ 更新 URL ,保持refresh後頁面一致
  const notebookId = currentNotebookId;
  updateHashParam('category', categoryId);
  
  setActiveSection(categoryId);

  const notes = await fetchNotesByCategory(categoryId);
  const noteList = document.getElementById('noteList');
  noteList.innerHTML = '';

  notes.forEach(note => {
    const li = document.createElement('li');
    li.className = 'bg-white rounded shadow-sm p-3 hover:bg-blue-50 cursor-pointer';
    li.dataset.noteId = note.id;
    li.innerHTML = `<div class="font-semibold">${note.title}</div><div class="text-gray-500 text-xs">${note.tags}</div>`;

    li.setAttribute('draggable', 'true');
    li.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', note.id);
    });

	li.addEventListener('click', async () => {
	  sessionStorage.setItem('currentNoteId', note.id);
      setActiveNote(note.id);
      //showEditor(note);
	  showPrevEditor(note);
	  
	  // ✅ 更新 URL：主動同步筆記的 category/notebook
	  const notebookId = note.notebook_id || currentNotebookId;
	  const categoryId = note.category_id || currentCategory;

	  const hash = `#notetree?notebook=${notebookId}&category=${categoryId}`;
	  window.history.replaceState({}, '', hash);
    });

    li.addEventListener('contextmenu', e => {
      e.preventDefault();
      currentRightClickNoteId = note.id;
      const menu = document.getElementById('contextMenu');
      menu.style.top = `${e.pageY}px`;
      menu.style.left = `${e.pageX}px`;
      menu.classList.remove('hidden');
    });

    noteList.appendChild(li);
  });
  
	const activeNoteId = noteToSelect || sessionStorage.getItem('currentNoteId');
	if (activeNoteId) {
	  const match = document.querySelector(`[data-note-id='${activeNoteId}']`);
	  if (match) {
		match.scrollIntoView({ behavior: 'smooth', block: 'center' });
		match.classList.add('bg-blue-100', 'font-semibold', 'ring');
		const note = await fetchNoteDetail(activeNoteId);
		preview.renderNoteDetail(note);
	  }
	}

}


export async function fetchNotesByCategory(categoryId) {
  const res = await fetch(`/api/notes?category_id=${categoryId}`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return await res.json();
}

export async function fetchNoteDetail(id) {
  const res = await fetch(`/api/notes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch note detail');
  return await res.json();
}

function showTooltip(message, x, y) {
  const tooltip = document.getElementById('contextTooltip');
  if (!tooltip) return;

  tooltip.textContent = message;
  tooltip.style.top = `${y + 10}px`;
  tooltip.style.left = `${x + 10}px`;
  tooltip.classList.remove('hidden');
  tooltip.style.opacity = '1';

  clearTimeout(tooltip._hideTimer);
  tooltip._hideTimer = setTimeout(() => {
    tooltip.style.opacity = '0';
    setTimeout(() => tooltip.classList.add('hidden'), 300);
  }, 2000);
}

function setupContextMenu() {
  const noteMenu = document.getElementById('noteMenu');
  const categoryMenu = document.getElementById('categoryMenu');
  const deleteCategoryOption = document.getElementById('deleteCategoryOption');

	
	document.addEventListener('contextmenu', e => {
	  const contextMenu = document.getElementById('contextMenu');
	  const noteMenu = document.getElementById('noteMenu');
	  const categoryMenu = document.getElementById('categoryMenu');

	  if (!contextMenu || !noteMenu || !categoryMenu) {
		console.warn('❌ contextMenu DOM not found. Canceling menu display.');
		return;
	  }

	  const noteEl = e.target.closest('[data-note-id]');
	  const catEl = e.target.closest('[data-category]');

	  if (noteEl) {
		e.preventDefault();
		currentRightClickNoteId = noteEl.dataset.noteId;
		currentRightClickCategory = null;
		noteMenu.classList.remove('hidden');
		categoryMenu.classList.add('hidden');
	  } else if (catEl) {
		e.preventDefault();
		currentRightClickCategory = catEl.dataset.category;
		currentRightClickCategoryName = catEl.textContent.trim();
		currentRightClickNoteId = null;
		noteMenu.classList.add('hidden');
		categoryMenu.classList.remove('hidden');
	  } else {
		// fallback - 點擊無效區域，關掉 menu
		contextMenu.classList.add('hidden');
		return;
	  }

	  contextMenu.style.top = `${e.pageY}px`;
	  contextMenu.style.left = `${e.pageX}px`;
	  contextMenu.classList.remove('hidden');
	});


	document.addEventListener('click', e => {
	  const contextMenu = document.getElementById('contextMenu');
	  if (!contextMenu) return; // ⛑ 若切到其它頁面沒有 contextMenu，避免報錯

	  if (!e.target.closest('#contextMenu')) {
		contextMenu.classList.add('hidden');
	  }
	});
 
	  // ✅ 用 bindOnce 保護所有 menu 內部的 click
	  bindOnce(document.getElementById('cancelContext'), 'click', () => {
		document.getElementById('contextMenu')?.classList.add('hidden');
	  });

	  bindOnce(document.getElementById('cancelCategoryContext'), 'click', () => {
		document.getElementById('contextMenu')?.classList.add('hidden');
	  });

  bindOnce(document.getElementById('deleteNoteOption'), 'click', async () => {
    if (!currentRightClickNoteId) return;
    if (!confirm('Are you sure you want to delete this note?')) return;

    const res = await fetch(`/api/notes/${currentRightClickNoteId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      contextMenu.classList.add('hidden');
      await selectSection(currentCategory);
      showToast('note.delete', 'delete', "" );

    } else {
      alert('❌ Failed to delete note.');
    }
  });

  bindOnce(document.getElementById('deleteCategoryOption'), 'click', async () => {
	
    if (!currentRightClickCategory) return;

    const notesRes = await fetch(`/api/notes?category_id=${encodeURIComponent(currentRightClickCategory)}`);
    const notes = await notesRes.json();

    if (notes.length > 0) {
      alert(`⚠️ Cannot delete category "${currentRightClickCategory}" because it still has ${notes.length} note(s).`);
      contextMenu.classList.add('hidden');
      return;
    }

    const ok = confirm(`Are you sure you want to delete empty category "${currentRightClickCategoryName}"?`);
    if (!ok) return;

    const res = await fetch(`/api/categories/${encodeURIComponent(currentRightClickCategory)}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      contextMenu.classList.add('hidden');
      await loadCategories();
      showToast('category.delete', 'delete', currentRightClickCategory); 
    } else {
      alert('❌ Failed to delete category.');
    }
  });
	

}

async function showPrevEditor(note) {
  try {
    preview.showLoadingSpinner();
	const res = await fetch(`/api/notes/${note.id}`);
	if (!res.ok) throw new Error('Fetch failed');
	const fullNote = await res.json();
	preview.renderNoteDetail(fullNote);
	preview.hideLoadingSpinner();
  } catch (err) {
	alert('❌ Failed to load note detail.');
	console.error(err);
  }
	
}
