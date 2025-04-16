import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.min.js';

function runWhenIdleOrLater(callback) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 200);
  }
}

function safeParseTags(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  try {
    return JSON.parse(input);
  } catch {
    return typeof input === 'string' ? [input] : [];
  }
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const categories = await res.json();
    console.log('📂 Categories fetched:', categories);
    // 若未來想展示在其他地方可額外處理
  } catch (err) {
    console.error('❌ 無法載入 categories', err);
  }
}



export async function init() {
  console.log('[📝] 初始化 Note Editor 頁面');

  // 初始化 TinyMCE
  tinymce?.remove();
  await tinymce.init({
    selector: '#editor',
    plugins: 'code codesample link image lists fullscreen table',
    toolbar: 'undo redo | table | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | codesample | link image | code | fullscreen',
    table_toolbar: "tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",
    height: 500,
    branding: false,
    license_key: 'gpl',
    codesample_languages: [
      { text: 'HTML/XML', value: 'markup' },
      { text: 'JavaScript', value: 'javascript' },
      { text: 'Python', value: 'python' },
      { text: 'Shell', value: 'bash' },
      { text: 'SQL', value: 'sql' }
    ],
    codesample_content_css: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css'
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

  async function loadTagSuggestions() {
    try {
      const res = await fetch('/api/tags');
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

  const id = sessionStorage.getItem('currentNoteId');
  if (id) {
    try {
      const waitForElement = async (selector) => {
        return new Promise((resolve, reject) => {
          const el = document.querySelector(selector);
          if (el) return resolve(el);
          const start = performance.now();
          const check = () => {
            const now = performance.now();
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            if (now - start > 1000) return reject(`Timeout: ${selector}`);
            requestAnimationFrame(check);
          };
          check();
        });
      };

      await waitForElement('#noteTitle');

      const res = await fetch(`/api/notes/${id}`);
      const note = await res.json();
      console.log('[📌] Current Note:', note);

      document.getElementById('noteTitle').value = note.title || '';
	const categoryInput = document.getElementById('categorySelect');
	if (categoryInput) categoryInput.value = note.category || '';
      tinymce.get('editor').setContent(note.content || '');

      const tags = safeParseTags(note.tags);
      tags.forEach(tagText => addTag(tagText));

      const allRes = await fetch('/api/notes');
      const allNotes = await allRes.json();
      runWhenIdleOrLater(() => buildRelatedList(note, allNotes));
    } catch (err) {
      console.error('❌ 載入筆記失敗：', err);
    }
  }


  document.getElementById('saveBtn')?.addEventListener('click', async () => {
    const userid = localStorage.getItem('userId');
    if (!userid) {
      alert('⚠️ Please log in first. Click the avatar at the top right to select your user identity.');
      return;
    }

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
      category,
      tags,
      content,
      userid,
      created_at: new Date().toISOString()
    };

    const res = await fetch(id ? `/api/notes/${id}` : '/api/notes', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('✅ Note saved successfully!');
      sessionStorage.removeItem('currentNoteId');
      window.location.hash = '#history';
      window.dispatchEvent(new Event('popstate'));
    } else {
      alert('❌ Failed to save the note.');
    }
  });

  function buildRelatedList(currentNote, allNotes) {
    const list = document.getElementById('relatedList');
    if (!list || !currentNote || !allNotes.length) return;

    const currentTags = new Set(safeParseTags(currentNote.tags));
    const currentTitle = (currentNote.title || '').toLowerCase();

    const related = allNotes.filter(note => {
      if (note.id === currentNote.id) return false;

      const titleMatch = note.title?.toLowerCase().includes(currentTitle);

      const tags = safeParseTags(note.tags);
      const tagMatch = tags.some(tag => currentTags.has(tag));

      return titleMatch || tagMatch;
    });

    list.innerHTML = '';

    if (!related.length) {
      list.innerHTML = '<li class="text-gray-400">No related notes found.</li>';
      return;
    }

    const container = document.createElement('div');
    container.className = 'flex flex-wrap gap-3';

    related.forEach(note => {
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
    }
  });
}
