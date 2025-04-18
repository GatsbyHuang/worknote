// notetree.js - for note-browser.html

let currentCategory = null;
let currentNotebookId = null;
let currentRightClickNoteId = null;
let currentRightClickCategory = null;

export async function init() {
  console.log('🧭 Note Browser Page Loaded');

  // ✅ 從 URL 取得 notebook id
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  currentNotebookId = params.get('notebook');
  onDocReady();
  await loadCategories();
  setupContextMenu();
  setupButtonEvents();
}

function onDocReady(){
    
      console.log("initi notetree ondocumentready")
      safeLucideRefresh();
      

      // 拖拉支援（單筆）
      document.addEventListener('dragstart', (e) => {
        if (e.target.matches('[data-note-id]')) {
          const noteId = e.target.dataset.noteId;
          e.dataTransfer.setData('noteId', noteId);
        }
      });

    document.querySelectorAll('#sectionItems').forEach(list => {
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetLi = e.target.closest('li[data-category]');
        if (targetLi) {
          targetLi.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50');
        }
      });

      list.addEventListener('dragleave', (e) => {
        const targetLi = e.target.closest('li[data-category]');
        if (targetLi) {
          targetLi.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50');
        }
      });

      list.addEventListener('drop', async (e) => {
        e.preventDefault();
        const noteId = e.dataTransfer.getData('noteId');
        const targetLi = e.target.closest('li[data-category]');
        if (!noteId || !targetLi) return;

        const newCategoryId = targetLi.dataset.category;

        const res = await fetch(`/api/notes/${noteId}/category`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_id: newCategoryId })
        });

        targetLi.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50');

        if (res.ok) {
          if (typeof window.selectSection === 'function') {
            await window.selectSection(newCategoryId);
          } else if (typeof window.loadCategories === 'function') {
            await window.loadCategories();
          }
        } else {
          alert('❌ Failed to move note');
        }
      });
    });


 
    
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
}


async function loadCategories() {
  if (!currentNotebookId) return;
  const res = await fetch(`/api/categories?notebook_id=${currentNotebookId}`);
  const categories = await res.json();
  const sectionList = document.getElementById('sectionItems');
  sectionList.innerHTML = '';

  categories.forEach(cat => {
    const li = document.createElement('li');
    li.textContent = cat.name;
    li.dataset.category = cat.id;
    li.className = 'cursor-pointer hover:bg-blue-100 px-2 py-1 rounded';
    li.setAttribute('draggable', false);

    li.addEventListener('click', () => selectSection(cat.id));

    li.addEventListener('dragover', e => {
      e.preventDefault();
      li.classList.add('dragover');
    });
    li.addEventListener('dragleave', () => li.classList.remove('dragover'));
    li.addEventListener('drop', async e => {
      e.preventDefault();
      li.classList.remove('dragover');
      const noteId = e.dataTransfer.getData('text/plain');
      if (!noteId) return;

      const res = await fetch(`/api/notes/${noteId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: cat.id })
      });

      if (res.ok) {
        console.log(`✅ Note ${noteId} moved to ${cat.name}`);
        selectSection(cat.id);
      } else {
        alert('❌ Failed to move note');
      }
    });

    sectionList.appendChild(li);
  });

  if (categories[0]) selectSection(categories[0].id);
}

function setActiveSection(categoryId) {
  currentCategory = categoryId;
  const all = document.querySelectorAll('#sectionItems li');
  all.forEach(li => li.classList.remove('bg-blue-100', 'text-blue-700', 'font-semibold'));
  const active = [...all].find(li => li.dataset.category === String(categoryId));
  if (active) active.classList.add('bg-blue-100', 'text-blue-700', 'font-semibold');
}

function setActiveNote(noteId) {
  const all = document.querySelectorAll('#noteList li');
  all.forEach(li => li.classList.remove('bg-blue-100', 'text-blue-700', 'font-semibold', 'ring'));
  const match = [...all].find(li => li.dataset.noteId === noteId);
  if (match) match.classList.add('bg-blue-100', 'text-blue-700', 'font-semibold', 'ring');
}

async function selectSection(categoryId) {
  currentCategory = categoryId;
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
      setActiveNote(note.id);
      //showEditor(note);
	  showPrevEditor(note);

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
}

function renderNoteDetail(note) {
		
	const viewer = document.getElementById('noteViewer');
	const hint = document.getElementById('noteEmptyHint');
	viewer.classList.remove('hidden');
	hint.classList.add('hidden');

	document.getElementById('noteTitle_pre').textContent = note.title || 'Untitled';
	document.getElementById('noteCategory').textContent = note.category_name || '-';
	document.getElementById('noteTime').textContent = new Date(note.created_at).toLocaleString();


	// Tags
	const tagsEl = document.getElementById('noteTags');
	tagsEl.innerHTML = '';

	// ✅ 修正：將字串 tags 解析為陣列
	let tagList = [];
	try {
	  tagList = typeof note.tags === 'string' ? JSON.parse(note.tags) : (note.tags || []);
	} catch (err) {
	  console.warn('Invalid tags format:', note.tags);
	}

	tagList.forEach(tag => {
	  const span = document.createElement('span');
	  span.className = 'inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full';
	  span.textContent = `#${tag}`;
	  tagsEl.appendChild(span);
	});


	// Content
	const contentEl = document.getElementById('noteContent');
	contentEl.innerHTML = note.content || '';

	lucide.createIcons();
	
	document.getElementById('closeEditModalBtn')?.addEventListener('click', () => {
	  document.getElementById('noteEditModal')?.classList.add('hidden');
	});
	
	document.getElementById('editNoteBtn')?.addEventListener('click', async () => {
	  lucide.createIcons();
	  sessionStorage.setItem('currentNoteId', note.id);

	  const modal = document.getElementById('noteEditModal');
	  const container = document.getElementById('noteEditorContainer');
	  const loading = document.getElementById('noteEditLoading'); // 👈 loading 層

	  modal.classList.remove('hidden');
	  loading?.classList.remove('hidden'); // 顯示 loading 動畫

	  try {
		const html = await fetch('/pages/note-editor.html').then(res => res.text());
		container.innerHTML = html;

		const module = await import('/js/pages/note-editor.js');
		await module.init();

	  } catch (err) {
		console.error('❌ 載入編輯器頁面失敗：', err);
		container.innerHTML = `<div class="text-red-600 p-4">❌ 無法載入編輯器，請稍後再試。</div>`;
	  } finally {
		loading?.classList.add('hidden'); // 無論成功或失敗都隱藏 loading
	  }
	});


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

function setupContextMenu() {
  const noteMenu = document.getElementById('noteMenu');
  const categoryMenu = document.getElementById('categoryMenu');
  const deleteCategoryOption = document.getElementById('deleteCategoryOption');

if (!window.__contextMenuSetupDone__) {
  document.addEventListener('contextmenu', e => {
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
      currentRightClickNoteId = null;
      noteMenu.classList.add('hidden');
      categoryMenu.classList.remove('hidden');
    } else {
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

  document.getElementById('cancelContext')?.addEventListener('click', () => {
    contextMenu.classList.add('hidden');
  });
  document.getElementById('cancelCategoryContext')?.addEventListener('click', () => {
    contextMenu.classList.add('hidden');
  });

  deleteNoteOption?.addEventListener('click', async () => {
    if (!currentRightClickNoteId) return;
    if (!confirm('Are you sure you want to delete this note?')) return;

    const res = await fetch(`/api/notes/${currentRightClickNoteId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      contextMenu.classList.add('hidden');
      await selectSection(currentCategory);
    } else {
      alert('❌ Failed to delete note.');
    }
  });

  deleteCategoryOption?.addEventListener('click', async () => {
	
    if (!currentRightClickCategory) return;

    const notesRes = await fetch(`/api/notes?category_id=${encodeURIComponent(currentRightClickCategory)}`);
    const notes = await notesRes.json();

    if (notes.length > 0) {
      alert(`⚠️ Cannot delete category "${currentRightClickCategory}" because it still has ${notes.length} note(s).`);
      contextMenu.classList.add('hidden');
      return;
    }

    const ok = confirm(`Are you sure you want to delete empty category "${currentRightClickCategory}"?`);
    if (!ok) return;

    const res = await fetch(`/api/categories/${encodeURIComponent(currentRightClickCategory)}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      contextMenu.classList.add('hidden');
      await loadCategories();
    } else {
      alert('❌ Failed to delete category.');
    }
  });
	
  window.__contextMenuSetupDone__ = true; // 🔒 記得只設一次
}
}

async function showPrevEditor(note) {
  try {
	const res = await fetch(`/api/notes/${note.id}`);
	if (!res.ok) throw new Error('Fetch failed');
	const fullNote = await res.json();
	renderNoteDetail(fullNote);
  } catch (err) {
	alert('❌ Failed to load note detail.');
	console.error(err);
  }
	
}

async function showEditor(note) {
  sessionStorage.setItem('currentNoteId', note.id);

  // 取得當前的 notebookId / categoryId，組裝 hash
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const notebookId = params.get('notebook');
  const categoryId = params.get('category') || note.category_id; // 若已有筆記分類，優先用它

  // 修改 hash 為 note-editor 並加上 notebook/category
  const newHash = `#note-editor?notebook=${notebookId || ''}&category=${categoryId || ''}`;
  window.history.pushState({}, '', newHash);

  // 載入內容
  const container = document.getElementById('noteDetail');
  const html = await fetch('/pages/note-editor.html').then(res => res.text());
  container.innerHTML = html;

  const module = await import('/js/pages/note-editor.js');
  await module.init();
}
