// note-preview.js - 控制右側預覽筆記區塊

export function init() {
  console.log('[👁️] note-preview 模組就緒');
}

/**
 * 顯示筆記內容到右側 preview viewer 區域
 * @param {Object} note - 筆記物件
 */
 
 
export function showLoadingSpinner() {
  document.getElementById('noteViewer')?.classList.remove('hidden');
  document.getElementById('noteEmptyHint')?.classList.add('hidden');
  document.getElementById('noteLoading')?.classList.remove('hidden');
  document.getElementById('noteContentWrapper')?.classList.add('hidden');
}

export function hideLoadingSpinner() {
  document.getElementById('noteLoading')?.classList.add('hidden');
  document.getElementById('noteContentWrapper')?.classList.remove('hidden');
}

 
export function renderNoteDetail(note) {
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
