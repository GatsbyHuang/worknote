let allNotes = [];
let fuseTitle = null;
let fuseTag = null;
let fuseContent = null;
let isFuzzyLoaded = false;
let debounceTimer = null;

function getCategoryColor(cat) {
  if (!cat) return '#ddd';
  const hash = [...cat].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

function getNotebookColor(name) {
  if (!name) return '#ccc';
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = (hash * 3) % 360;
  return `hsl(${hue}, 60%, 90%)`;
}

async function loadFuzzyData(notebookId = null) {
  try {
    const url = notebookId ? `/api/notes?notebook_id=${notebookId}` : '/api/notes';
    const res = await fetch(url);
    allNotes = await res.json();

    fuseTitle = new Fuse(allNotes, { includeScore: true, threshold: 0.4, keys: ['title'] });
    fuseTag = new Fuse(allNotes, { includeScore: true, threshold: 0.4, useExtendedSearch: true, keys: ['tags'] });
    fuseContent = new Fuse(allNotes, { includeScore: true, threshold: 0.4, keys: ['content'] });
    isFuzzyLoaded = true;
  } catch (err) {
    console.error('❌ 無法載入資料：', err);
  }
}

function handleFuzzySearch(keyword) {
  const resultList = document.getElementById('fuzzyResults');
  
    // 🔒 資料還沒載入好時，顯示 loading 或提示
  if (!isFuzzyLoaded || !fuseTitle || !fuseTag || !fuseContent) {
    resultList.innerHTML = '<li class="text-gray-400 px-2 py-4 text-center">Loading data, please wait...</li>';
    return;
  }
  
  if (!keyword) {
    resultList.innerHTML = '<li class="text-gray-400 px-2 py-4 text-center">Start typing to search...</li>';
    return;
  }

  const titleMatches = fuseTitle.search(keyword.toLowerCase()).slice(0, 10);
  const tagMatches = fuseTag.search(keyword.toLowerCase()).slice(0, 10);
  const contentMatches = fuseContent.search(keyword.toLowerCase()).slice(0, 10);

  const buildItems = (matches, keyword) => matches.map(({ item }) => {
    const cat = item.category_name || 'Uncategorized';
    const catColor = getCategoryColor(cat);
    const book = item.notebook_name || 'Default';
    const bookColor = getNotebookColor(book);

    const highlightedTitle = item.title.replace(new RegExp(keyword, 'gi'), match =>
      `<mark class="bg-yellow-200 rounded">${match}</mark>`
    );
    const plainTextContent = item.content.replace(/<[^>]+>/g, '');
	const tagsHtml = (item.tags || []).map(tag =>
		`<span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">${tag}</span>`
	  ).join('');

	return `
	  <li class="flex justify-between items-start gap-3 px-3 py-3 hover:bg-blue-50 hover:shadow-sm rounded-md cursor-pointer transition" data-id="${item.id}">
		<div class="flex-1">
		  <div class="font-medium text-gray-800">${highlightedTitle}</div>
		  <div class="text-xs text-gray-400 line-clamp-2">${plainTextContent.slice(0, 150)}</div>
		  <div class="flex flex-wrap gap-2 mt-2">
			<span class="text-xs px-2 py-0.5 rounded-full" style="background-color:${bookColor}">${book}</span>
			<span class="text-xs px-2 py-0.5 rounded-full" style="background-color:${catColor}">${cat}</span>
			<div class="flex gap-1.5 flex-wrap items-center">
			  ${tagsHtml} <!-- Tags 保持黃系，間距拉開 -->
			</div>
		  </div>
		</div>
	  </li>
	`;
	}).join('');

  resultList.innerHTML = `
    <li class="text-sm font-semibold text-blue-600 px-3 py-2">📘 Title Match</li>
    ${titleMatches.length ? buildItems(titleMatches) : '<li class="px-3 py-2 text-gray-400">No title match</li>'}
    <li class="text-sm font-semibold text-yellow-600 px-3 py-2">🏷️ Tag Match</li>
    ${tagMatches.length ? buildItems(tagMatches) : '<li class="px-3 py-2 text-gray-400">No tag match</li>'}
    <li class="text-sm font-semibold text-gray-600 px-3 py-2">📰 Content Match</li>
    ${contentMatches.length ? buildItems(contentMatches) : '<li class="px-3 py-2 text-gray-400">No content match</li>'}
  `;

  document.querySelectorAll('#fuzzyResults li[data-id]')?.forEach(li => {
    li.addEventListener('click', () => {
      const id = li.dataset.id;
      const note = allNotes.find(n => n.id == id);
      if (!note) return;

      sessionStorage.setItem('currentNoteId', id);
      const notebookId = note.notebook_id || '';
      const categoryId = note.category_id || '';
      window.location.hash = `#notetree?notebook=${notebookId}&category=${categoryId}`;
      document.getElementById('fuzzyModal').classList.add('hidden');
    });
  });
}

function initFuzzyModal() {
  const inputEl = document.getElementById('fuzzySearchInput');

  document.getElementById('globalSearchBtn')?.addEventListener('click', async () => {
	console.log("click treigger")
    document.getElementById('fuzzyModal').classList.remove('hidden');
    inputEl.focus();

    if (!isFuzzyLoaded) {
      await loadNotebookOptions();
      await loadFuzzyData();
    }
  });

  document.getElementById('fuzzyModalClose')?.addEventListener('click', () => {
    document.getElementById('fuzzyModal').classList.add('hidden');
  });

	inputEl?.addEventListener('input', (e) => {
	  if (!isFuzzyLoaded) return;  // 🔒 防止還沒載入時觸發
	  clearTimeout(debounceTimer);
	  debounceTimer = setTimeout(() => {
		handleFuzzySearch(e.target.value.trim());
	  }, 300);
	});


  document.getElementById('toggleAdvancedSearch')?.addEventListener('click', () => {
    const panel = document.getElementById('advancedSearchPanel');
    panel.classList.toggle('hidden');
    document.getElementById('toggleAdvancedSearch').textContent = panel.classList.contains('hidden') 
      ? 'Advanced Search ▼' 
      : 'Advanced Search ▲';
  });

  document.getElementById('searchNotebookSelect')?.addEventListener('change', async () => {
    isFuzzyLoaded = false;
    const notebookId = document.getElementById('searchNotebookSelect').value;
    await loadFuzzyData(notebookId);
    const keyword = inputEl.value.trim();
    if (keyword) handleFuzzySearch(keyword);
  });
}

async function loadNotebookOptions() {
  const res = await fetch('/api/notebooks');
  const notebooks = await res.json();
  const select = document.getElementById('searchNotebookSelect');
  select.innerHTML = '<option value="">All Notebooks</option>';
  notebooks.forEach(nb => {
    const opt = document.createElement('option');
    opt.value = nb.id;
    opt.textContent = nb.name;
    select.appendChild(opt);
  });
}

window.addEventListener('DOMContentLoaded', initFuzzyModal);