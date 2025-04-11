import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.min.js';


function runWhenIdleOrLater(callback) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 200);
  }
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const categories = await res.json();
    const select = document.getElementById('categorySelect');
    select.innerHTML = '<option value="">Select category</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
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
	  plugins: 'code codesample link image lists fullscreen table ',  // 加上 fullscreen
	  toolbar: 'undo redo | table | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | codesample | link image | code | fullscreen', // 加入 fullscreen 按鈕
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
	  const cleaned = text.trim().toLowerCase(); // 統一比對格式
	  if (!cleaned) return;

	  // 檢查是否已存在同名 tag
	  const existing = Array.from(tagContainer.querySelectorAll('span'))
		.some(el => el.firstChild?.nodeValue.trim().toLowerCase() === cleaned);
	  if (existing) return;

	  // 建立 tag 元素
	  const tag = document.createElement('span');
	  tag.className = 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1';
	  tag.innerHTML = `${text}<button class="ml-1 text-gray-600 hover:text-red-500" onclick="this.parentElement.remove()">&times;</button>`;
	  tagContainer.insertBefore(tag, tagInput);
	}



	function buildRelatedList(currentNote, allNotes) {
	  const list = document.getElementById('relatedList');
	  if (!list || !currentNote || !allNotes.length) return;

	  const currentTags = new Set(
		Array.isArray(currentNote.tags)
		  ? currentNote.tags
		  : JSON.parse(currentNote.tags || '[]')
	  );
	  const currentTitle = (currentNote.title || '').toLowerCase();

	  const related = allNotes.filter(note => {
		if (note.id === currentNote.id) return false;

		const titleMatch = note.title?.toLowerCase().includes(currentTitle);

		let tags = [];
		try {
		  tags = Array.isArray(note.tags) ? note.tags : JSON.parse(note.tags || '[]');
		} catch {
		  tags = [];
		}
		const tagMatch = tags.some(tag => currentTags.has(tag));

		return titleMatch || tagMatch;
	  });

	  list.innerHTML = '';

	  if (!related.length) {
		list.innerHTML = '<li class="text-gray-400">No related notes found.</li>';
		return;
	  }

	  // 🔁 用 span + inline 方式呈現一行
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

  // 分類新增
document.getElementById('addCategory')?.addEventListener('click', async () => {
  const newCat = document.getElementById('newCategory').value.trim();
  if (!newCat) return;

  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCat })
    });

    if (res.ok) {
      const select = document.getElementById('categorySelect');
      const option = document.createElement('option');
      option.value = newCat;
      option.text = newCat;
      option.selected = true;
      select.add(option);
      document.getElementById('newCategory').value = '';
    } else {
      alert('❌ 無法新增分類');
    }
  } catch (err) {
    console.error('❌ 新增分類失敗：', err);
  }
});

  // 分類刪除
document.getElementById('deleteCategory')?.addEventListener('click', async () => {
  const category = document.getElementById('categorySelect').value;
  if (!category) return alert('⚠️ 請先選擇一個要刪除的分類');

  if (!confirm(`確定要刪除分類「${category}」？`)) return;

  const res = await fetch(`/api/categories/${category}`, { method: 'DELETE' });
  if (res.ok) {
    alert(`🗑 已刪除分類：${category}`);
    loadCategories(); // refresh list
  } else {
    alert('❌ 刪除失敗！');
  }
});



  // 顯示 tag 建議
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

  // 載入資料進入編輯模式
	const id = sessionStorage.getItem('currentNoteId');
	if (id) {
	  try {
		const res = await fetch(`/api/notes/${id}`);
		const note = await res.json();
		console.log('[📌] Current Note:', note);

		document.getElementById('noteTitle').value = note.title || '';
		document.getElementById('categorySelect').value = note.category || '';
		tinymce.get('editor').setContent(note.content || '');

		const tags = JSON.parse(note.tags || '[]');
		tags.forEach(tagText => addTag(tagText));

		// 🚀 載入全部筆記來找 related
		const allRes = await fetch('/api/notes');
		const allNotes = await allRes.json();
	    //頁面空閒時才觸發比對與渲染，不會拖慢主畫面的初始化。
		runWhenIdleOrLater(() => buildRelatedList(note, allNotes));

	  } catch (err) {
		console.error('❌ 載入筆記失敗：', err);
	  }
	}



	// Save button
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


}
