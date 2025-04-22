import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.min.js';
import { bindOnce } from './utils.js';

let isEdit = false; 

function runWhenIdleOrLater(callback) {
  if ('requestIdleCallback' in window) {
	console.log("support requestIdleCallback")
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 500);
  }
}

async function loadCategories(notebookId, preselectCategoryId = null) {
  const categorySelect = document.getElementById('categorySelect');
  categorySelect.innerHTML = '<option value="">Select category</option>';

  const categories = await fetch(`/api/categories?notebook_id=${notebookId}`).then(r => r.json());
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    categorySelect.appendChild(opt);
  });

  if (preselectCategoryId) {
    categorySelect.value = preselectCategoryId;
  }
}

export async function init() {
  console.log('[📝] 初始化 Note Editor 頁面');

  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const urlNotebookId = params.get('notebook');
  const urlCategoryId = params.get('category');
  const noteId = sessionStorage.getItem('currentNoteId');

  if (urlNotebookId) sessionStorage.setItem('currentNotebookId', urlNotebookId);
  if (urlCategoryId) sessionStorage.setItem('currentCategoryId', urlCategoryId);

  const notebookId = sessionStorage.getItem('currentNotebookId');
  const categoryId = sessionStorage.getItem('currentCategoryId');

  const notebooks = await fetch('/api/notebooks').then(r => r.json());
  const notebookSelect = document.getElementById('notebookSelect');
  notebooks.forEach(nb => {
    const opt = document.createElement('option');
    opt.value = nb.id;
    opt.textContent = nb.name;
    notebookSelect.appendChild(opt);
  });
  if (notebookId) notebookSelect.value = notebookId;

  if (notebookId) {
    await loadCategories(notebookId, categoryId);
  }

  notebookSelect.addEventListener('change', async (e) => {
    sessionStorage.setItem('currentNotebookId', e.target.value);
    await loadCategories(e.target.value);
  });

  tinymce?.remove();
  await tinymce.init({
    selector: '#editor',
    plugins: 'code codesample link image lists fullscreen table ',
    toolbar: 'undo redo | table | formatselect | bold italic | alignleft aligncenter alignright | outdent indent | forecolor backcolor |bullist numlist | codesample | link image | code | fullscreen',
    table_toolbar: "tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",
    height: 500,
    branding: false,
    license_key: 'gpl',
    codesample_languages: [
      { text: 'Python', value: 'python' },
      { text: 'HTML/XML', value: 'markup' },
      { text: 'JavaScript', value: 'javascript' },
      { text: 'Shell', value: 'bash' },
      { text: 'SQL', value: 'sql' }
    ],
    codesample_content_css: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css',
	
	  
    setup(editor) {
      editor.on('Change Input Undo Redo', () => {
        isEdit = true;
      });
    }
	
  });
  

  await loadCategories();

  const tagContainer = document.getElementById('tagContainer');
  const tagInput = document.getElementById('tagInput');

  function addTag(text) {
    const cleaned = text.trim().toLowerCase();
    if (!cleaned) return;
    const existing = Array.from(tagContainer.querySelectorAll('span'))
      .some(el => el.firstChild?.nodeValue.trim().toLowerCase() === cleaned);
    if (existing) return;

    const tag = document.createElement('span');
    tag.className = 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1';
    tag.innerHTML = `${text}<button class="ml-1 text-gray-600 hover:text-red-500" onclick="this.parentElement.remove()">&times;</button>`;
    tagContainer.insertBefore(tag, tagInput);
  }

function buildRelatedList(currentNote, allNotes) {
  const list = document.getElementById('relatedList');
  console.log(list)
  if (!list || !currentNote || !allNotes.length) return;

  const currentTitle = (currentNote.title || '').trim().toLowerCase();
  console.log("currentTitle=",currentTitle)
  if (currentTitle === 'untitled' || currentTitle === '') {
    list.innerHTML = '<li class="text-gray-400">Draft mode - no related notes.</li>';
    return;  // 直接跳出，不做 fuzzy search
  }

  list.innerHTML = '';

  const fuse = new Fuse(allNotes.filter(note => note.id !== currentNote.id), {
    keys: [
      { name: 'title', weight: 0.3 },
      { name: 'tags', weight: 0.2 },
      { name: 'content', weight: 0.5 }
    ],
    threshold: 0.3
  });

  const searchQuery = currentNote.title || '';
  const results = fuse.search(searchQuery).slice(0, 5);  // 限制前5

  if (!results.length) {
    list.innerHTML = '<li class="text-gray-400">No related notes found.</li>';
    return;
  }

  const container = document.createElement('div');
  container.className = 'flex flex-wrap gap-3';

  results.forEach(({ item: note }) => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'text-blue-600 hover:underline whitespace-nowrap';
    a.textContent = note.title;
    a.dataset.id = note.id;

    a.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.setItem('currentNoteId', note.id);
      window.location.hash = '#note-editor';
      window.dispatchEvent(new Event('popstate'));
    });

    container.appendChild(a);
  });

  const li = document.createElement('li');
  li.appendChild(container);
  list.appendChild(li);
}


  tagInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && tagInput.value.trim()) {
      e.preventDefault();
      addTag(tagInput.value.trim());
      tagInput.value = '';
	  isEdit = true;
    }
  });
  
    bindOnce(document.getElementById('noteTitle'), 'input', () => {
	  isEdit = true;

	});

	bindOnce(document.getElementById('notebookSelect'), 'change', () => {
	  isEdit = true;
	});

	bindOnce(document.getElementById('categorySelect'), 'change', () => {
	  isEdit = true;
	});


function startAutoSave() {
  //auto saved after content changed over 1 mins
  if (window.__autoSaveStarted__) return;
  window.__autoSaveStarted__ = true;

  setInterval(async () => {
    if (!isEdit) return;

    const userid = localStorage.getItem('userId');
    const notebookId = document.getElementById('notebookSelect').value;
    const title = document.getElementById('noteTitle').value.trim();
    const category = document.getElementById('categorySelect').value.trim();
    const content = tinymce.get('editor').getContent();
    const tags = Array.from(document.querySelectorAll('#tagContainer span'))
      .map(el => el.firstChild?.nodeValue?.trim())
      .filter(Boolean);

    if (!title || !content || !category || tags.length === 0) return;

    const payload = {
      title,
      content,
      tags,
      category_id: category,
      created_at: new Date().toISOString(),
      userid
    };

    const noteId = sessionStorage.getItem('currentNoteId');
    const res = await fetch(noteId ? `/api/notes/${noteId}` : '/api/notes', {
      method: noteId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      isEdit = false;
	  console.log("auto saved.")
      showAutoSaveMask();
    }
  }, 60000);
}

startAutoSave();

function showAutoSaveMask() {
	const notice = document.getElementById('autoSaveNotice');
	notice.classList.remove('hidden');
	notice.style.opacity = '1';
	setTimeout(() => {
	  notice.style.opacity = '0';
	  setTimeout(() => notice.classList.add('hidden'), 500);
	}, 2000);
}



async function loadTagSuggestions() {
  try {
    // 取得 URL 中的參數
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const notebookId = urlParams.get('notebook');
    const categoryId = urlParams.get('category');

    // 組合 API 查詢參數
    const params = new URLSearchParams();
    if (notebookId) params.append('notebook_id', notebookId);
    if (categoryId) params.append('category_id', categoryId);

    const res = await fetch(`/api/tags${params.toString() ? `?${params.toString()}` : ''}`);
    const data = await res.json();

    const tagBox = document.getElementById('tagSuggestions');
    if (!tagBox) return;

    tagBox.innerHTML = '';
    (data || []).forEach(tagObj => {
      const tag = tagObj.name;
      const btn = document.createElement('button');
      btn.textContent = `#${tag}`;
      btn.className = 'px-2 py-1 text-xs bg-gray-100 rounded hover:bg-blue-100';
      btn.addEventListener('click', () => addTag(tag));
      tagBox.appendChild(btn);
    });
  } catch (err) {
    console.error('❌ 無法取得 tag suggestions:', err);
  }
}



  await loadTagSuggestions();

  if (noteId) {
    try {
      const res = await fetch(`/api/notes/${noteId}`);
      const note = await res.json();
      console.log('[📌] Current Note:', note);
      document.getElementById('noteTitle').value = note.title || '';
      tinymce.get('editor').setContent(note.content || '');

      const categorySelect = document.getElementById('categorySelect');
      if (note.category_id) categorySelect.value = note.category_id;

      const tags = JSON.parse(note.tags || '[]');
      tags.forEach(tagText => addTag(tagText));


	  const limit = 10;  // 你可以根據需要調整這個值
	  const relatedRes = await fetch(`/api/notes/related/${note.id}?limit=${limit}`);
      const relatedNotes = await relatedRes.json();
      runWhenIdleOrLater(() => buildRelatedList(note, relatedNotes));
	  

    } catch (err) {
      console.error('❌ 載入筆記失敗：', err);
    }
  }

  // ✅ Save handler 防止多次綁定
  if (window.__saveHandler__) {
    document.getElementById('saveBtn')?.removeEventListener('click', window.__saveHandler__);
  }

  const saveHandler = async () => {
    const userid = localStorage.getItem('userId');
    if (!userid) {
      alert('⚠️ Please log in first. Click the avatar at the top right to select your user identity.');
      return;
    }

    const notebookId = document.getElementById('notebookSelect').value;
    const title = document.getElementById('noteTitle').value.trim();
    const category = document.getElementById('categorySelect').value.trim();
    const content = tinymce.get('editor').getContent();
    const tags = Array.from(document.querySelectorAll('#tagContainer span'))
      .map(el => el.firstChild?.nodeValue?.trim())
      .filter(Boolean);

    if (!title || !content || !category) return alert('❗ Please fill in the title , content and category!');
    if (tags.length === 0) return alert('⚠️ Please enter at least one tag!');

    const payload = {
      title,
      content,
      tags,
      category_id: category,
      created_at: new Date().toISOString(),
      userid: localStorage.getItem('userId')
    };

    const res = await fetch(noteId ? `/api/notes/${noteId}` : '/api/notes', {
      method: noteId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('✅ Note saved successfully!');
	  sessionStorage.setItem('currentNoteId', noteId);
      window.location.hash = `#notetree?notebook=${notebookId}&category=${category}`;
      window.dispatchEvent(new Event('popstate'));
    } else {
      alert('❌ Failed to save the note.');
    }
  };

  document.getElementById('saveBtn')?.addEventListener('click', saveHandler);
  window.__saveHandler__ = saveHandler;
}
