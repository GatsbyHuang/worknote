// notetree.js - for note-browser.html

export async function init() {
  console.log('🧭 Note Browser Page Loaded');
  await loadSections();
  initNoteBrowser();
}
// notetree.js - for note-browser.html

let currentCategory = null;
let currentRightClickNoteId = null;
let currentRightClickCategory = null;

export async function initNoteBrowser() {
  console.log('📂 Note Browser Init');
  await loadCategories();
  setupContextMenu();
  setupButtonEvents();
}

function setupButtonEvents() {
  document.getElementById('addSectionBtn')?.addEventListener('click', async () => {
    const name = prompt('New category name?');
    if (!name) return;

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (res.ok) {
      await loadCategories();
    } else {
      alert('❌ Failed to add category');
    }
  });

  document.getElementById('addNoteBtn')?.addEventListener('click', async () => {
    if (!currentCategory) {
      alert('⚠️ Please select a category first');
      return;
    }

    const payload = {
      title: 'Untitled',
      content: '',
      tags: [],
      category: currentCategory,
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
      await showEditor(noteDetail);
    }
  });
}

async function loadCategories() {
  const res = await fetch('/api/categories');
  const categories = await res.json();
  const sectionList = document.getElementById('sectionItems');
  sectionList.innerHTML = '';

  categories.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    li.dataset.category = name;
    li.className = 'cursor-pointer hover:bg-blue-100 px-2 py-1 rounded';
    li.setAttribute('draggable', false);

    li.addEventListener('click', () => selectSection(name));

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
        body: JSON.stringify({ category: name })
      });

      if (res.ok) {
        console.log(`✅ Note ${noteId} moved to ${name}`);
        selectSection(name);
      } else {
        alert('❌ Failed to move note');
      }
    });

    sectionList.appendChild(li);
  });

  if (categories[0]) selectSection(categories[0]);
}

async function loadSections() {
  const sections = await fetchCategories();
  const container = document.getElementById('sectionItems');
  container.innerHTML = '';

  sections.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    li.className = 'cursor-pointer hover:bg-blue-100 px-2 py-1 rounded';
    li.dataset.category = name;
    li.addEventListener('click', () => selectSection(name));

    // 🟦 支援 Drop 拖拉筆記進來
    li.addEventListener('dragover', e => e.preventDefault());
    li.addEventListener('drop', async e => {
      e.preventDefault();
      const noteId = e.dataTransfer.getData('text/plain');
      if (!noteId) return;


	  const res = await fetch(`/api/notes/${noteId}/category`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ category: name })
	  });
      if (res.ok) {
        console.log(`✅ Note ${noteId} moved to ${name}`);
        selectSection(name); // refresh
      } else {
        alert('❌ Failed to move note');
      }
    });

    container.appendChild(li);
  });
  
  

  if (sections[0]) selectSection(sections[0]);
}



function setActiveSection(name) {
  currentCategory = name;
  const all = document.querySelectorAll('#sectionItems li');
  all.forEach(li => li.classList.remove('bg-blue-100', 'text-blue-700', 'font-semibold'));
  const active = [...all].find(li => li.dataset.category === name);
  if (active) active.classList.add('bg-blue-100', 'text-blue-700', 'font-semibold');
}

function setActiveNote(noteId) {
  const all = document.querySelectorAll('#noteList li');
  all.forEach(li => li.classList.remove('bg-blue-100', 'text-blue-700', 'font-semibold', 'ring'));
  const match = [...all].find(li => li.dataset.noteId === noteId);
  if (match) match.classList.add('bg-blue-100', 'text-blue-700', 'font-semibold', 'ring');
}

async function selectSection(category) {
  currentCategory = category;
  setActiveSection(category);

  const notes = await fetchNotesByCategory(category);
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

    li.addEventListener('click', () => {
      setActiveNote(note.id);
      showEditor(note);
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

function setupContextMenu() {
  const contextMenu = document.getElementById('contextMenu');
  const noteMenu = document.getElementById('noteMenu');
  const categoryMenu = document.getElementById('categoryMenu');
  const deleteNoteOption = document.getElementById('deleteNoteOption');
  const deleteCategoryOption = document.getElementById('deleteCategoryOption');

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

    const notesRes = await fetch(`/api/notes?category=${encodeURIComponent(currentRightClickCategory)}`);
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
}

async function showEditor(note) {
  sessionStorage.setItem('currentNoteId', note.id);
  const container = document.getElementById('noteDetail');
  const html = await fetch('/pages/note-editor.html').then(res => res.text());
  container.innerHTML = html;

  const module = await import('/js/pages/note-editor.js');
  await module.init();
}

export async function fetchCategories() {
  const res = await fetch('/api/categories');
  if (!res.ok) throw new Error('Failed to fetch categories');
  return await res.json();
}

export async function fetchNotesByCategory(category) {
  const res = await fetch(`/api/notes?category=${encodeURIComponent(category)}`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return await res.json();
}

export async function fetchNoteDetail(id) {
  const res = await fetch(`/api/notes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch note detail');
  return await res.json();
}
