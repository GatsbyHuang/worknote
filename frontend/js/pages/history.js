import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.min.js';

export async function onBefore() {
  console.log('[📜] History 頁面載入中...');
}

export async function init() {
  console.log('[📜] 初始化 History 頁面');

  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('filterCategory');
  const sortSelect = document.getElementById('sortSelect');
  const clearBtn = document.getElementById('clearFilters');
  const listContainer = document.getElementById('historyNoteList');

  let allNotes = [];
  let currentLimit = 30;
  let fuse = null;

  try {
    const res = await fetch('/api/notes');
    allNotes = await res.json();
    initFuzzySearchAsync(); // Lazy 初始化 Fuse
  } catch (err) {
    console.error('❌ 無法取得筆記：', err);
  }

  renderLimitButtons(allNotes.length);
  await loadCategories();

  function getTagColor(tag) {
    const hash = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 85%)`;
  }

  function renderLimitButtons(totalCount) {
    const container = document.getElementById('limitBtns');
    container.innerHTML = '<span class="mr-1">Limit:</span>';
    const limits = [];
    for (let i = 1; i <= 4; i++) {
      const value = i * 30;
      if (value < totalCount) limits.push(value);
    }
    limits.forEach(limit => {
      const btn = document.createElement('button');
      btn.className = 'text-blue-500 hover:underline limit-btn';
      btn.dataset.limit = limit;
      btn.textContent = limit;
      container.appendChild(btn);
    });
    const allBtn = document.createElement('button');
    allBtn.className = 'text-blue-500 hover:underline limit-btn';
    allBtn.dataset.limit = 'all';
    allBtn.textContent = 'All';
    container.appendChild(allBtn);

    container.querySelectorAll('.limit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentLimit = btn.dataset.limit === 'all' ? Infinity : parseInt(btn.dataset.limit);
        applyFilters();
      });
    });
  }

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const categories = await res.json();

    categoryFilter.innerHTML = '';

    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All Categories';
    categoryFilter.appendChild(allOpt);

    categories.forEach(cat => {
	  console.log(categories)
      const opt = document.createElement('option');
      opt.value = cat.id;           // ✅ category_id
      opt.textContent = cat.name;   // ✅ 顯示名稱
      categoryFilter.appendChild(opt);
    });

    categoryFilter.addEventListener('change', () => {
      if (categoryFilter.value === '') searchInput.value = '';
      applyFilters();
    });
  } catch (err) {
    console.error('❌ 無法載入分類：', err);
  }
}


  function formatRelativeTime(dateStr) {
    const now = new Date();
    const diffSec = Math.floor((now - new Date(dateStr)) / 1000);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    if (diffSec < 60) return rtf.format(-diffSec, 'second');
    if (diffSec < 3600) return rtf.format(-Math.floor(diffSec / 60), 'minute');
    if (diffSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), 'hour');
    return rtf.format(-Math.floor(diffSec / 86400), 'day');
  }

function renderNotes(notes) {
  listContainer.innerHTML = '';
  if (!notes.length) {
    listContainer.innerHTML = '<li class="py-2 text-gray-400">No matching notes.</li>';
    return;
  }

  document.getElementById('noteStats')?.remove();
  const stats = document.createElement('div');
  stats.id = 'noteStats';
  stats.className = 'text-sm text-gray-500 px-1';
  stats.innerHTML = `📄 Found ${notes.length} of ${allNotes.length} notes`;
  listContainer.before(stats);

  notes.slice(0, currentLimit).forEach(note => {
    const li = document.createElement('li');
    li.className = 'p-3 rounded-lg bg-white shadow-sm hover:shadow transition space-y-1 cursor-pointer';

    const time = formatRelativeTime(note.created_at);
	const exactTime = new Date(note.created_at).toLocaleString(); // tooltip


    // Notebook badge
    const notebook = `<span class="bg-gray-200 text-gray-900 text-xs px-2 py-0.5 rounded">${note.notebook_name || 'No Notebook'}</span>`;

    // Category badge
    const category = `<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">${note.category_name}</span>`;

    // Tag badges
    let tagHTML = '';
    try {
      const tags = Array.isArray(note.tags) ? note.tags : JSON.parse(note.tags || '[]');
      tagHTML = tags.map(tag => {
        const color = getTagColor(tag);
        return `<button class="text-xs px-2 py-0.5 rounded tag-btn" style="background-color:${color}">${tag}</button>`;
      }).join(' ');
    } catch (err) {
      console.warn('[⚠️ tag parse failed]', note.tags, err);
    }

    li.innerHTML = `
      <div class="flex justify-between items-center flex-wrap gap-2 text-xs">
        <div class="flex flex-wrap gap-2 items-center">${notebook} ${category} ${tagHTML}</div>
        <div class="flex items-center gap-2 whitespace-nowrap">
          <button class="text-blue-500 hover:underline edit-btn">✏️ Edit</button>
          <button class="text-red-500 hover:underline delete-btn">🗑 Delete</button>
		  <span class="text-gray-400" title="${exactTime}">
			🧑 ${note.userid || 'anonymous'} ・ ${time}
		  </span>
        </div>
      </div>
      <div class="text-sm font-semibold text-gray-800 truncate">${note.title}</div>
      <div class="text-sm text-gray-600 preview">${note.content.replace(/<[^>]+>/g, '').slice(0, 100)}...</div>
      <div class="text-sm text-gray-700 full hidden">${note.content}</div>
    `;

    li.querySelectorAll('.tag-btn')?.forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        searchInput.value = btn.textContent;
        applyFilters();
      });
    });

    li.querySelector('.edit-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      sessionStorage.setItem('currentNoteId', note.id);
      window.location.hash = '#note-editor';
      window.dispatchEvent(new Event('popstate'));
    });

    li.querySelector('.delete-btn')?.addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm(`確定刪除「${note.title}」？`)) {
        const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
        if (res.ok) {
          allNotes = allNotes.filter(n => n.id !== note.id);
          applyFilters();
        }
      }
    });

    li.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      li.querySelector('.preview')?.classList.toggle('hidden');
      li.querySelector('.full')?.classList.toggle('hidden');
    });

    listContainer.appendChild(li);
  });
}

  function initFuzzySearchAsync() {
    if (!window.requestIdleCallback) return setTimeout(buildFuse, 300);
    requestIdleCallback(buildFuse);
  }

  function buildFuse() {
    console.log('[🔍] 建立 Fuzzy Index...');
    fuse = new Fuse(allNotes, {
      includeScore: true,
      threshold: 0.4,
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'content', weight: 0.25 },
        { name: 'tags', weight: 0.25 }
      ]
    });
    console.log('[✅] Fuzzy Index 建立完成');
  }

  function applyFilters() {
    const keyword = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;
    const sort = sortSelect.value;

    let result = [];

    if (keyword && fuse) {
      result = fuse.search(keyword).map(r => r.item);
    } else {
      result = [...allNotes];
    }

    if (category) {
      result = result.filter(note => String(note.category_id) === category);
    }

    if (sort === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === 'oldest') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === 'az') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    const limited = result.slice(0, currentLimit);
    renderNotes(limited);
  }

  // 搜尋 / 篩選
  searchInput.addEventListener('input', applyFilters);
  categoryFilter.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', applyFilters);

  document.getElementById('toggleViewBtn')?.addEventListener('click', () => {
    showFullContent = !showFullContent;
    document.getElementById('toggleViewBtn').textContent = showFullContent ? '🌗 Prev' : '🌓 Full';
    document.querySelectorAll('.preview').forEach(p => {
      p.classList.toggle('hidden', showFullContent);
    });
    document.querySelectorAll('.full').forEach(p => {
      p.classList.toggle('hidden', !showFullContent);
    });
  });

  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    searchInput.value = '';
    categoryFilter.value = '';
    sortSelect.value = 'newest';
    applyFilters();
  });

  let showFullContent = false;

  applyFilters();
}




export async function onAfter() {
  console.log('[📊] Dashboard loaded.');
}

export async function onError(err) {
  console.error('[📊] Dashboard 發生錯誤：', err);
}