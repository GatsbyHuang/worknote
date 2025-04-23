export async function onBefore() {
  console.log('[📊] Dashboard loading...');
}

export async function init() {
  console.log('[📊] 初始化 Dashboard');

  try {
    const statsRes = await fetch('/api/dashboard');
    const stats = await statsRes.json();

    // 更新卡片統計
    document.getElementById('statTotal').textContent = stats.total_notes;
    document.getElementById('statCategories').textContent = stats.unique_categories;
    document.getElementById('statTags').textContent = stats.unique_tags;
    document.getElementById('statLastUpdated').textContent = formatRelativeTime(stats.last_updated);
    document.getElementById('statNotebooks').textContent = stats.total_notebooks;

    // Top Notebooks
    const nbList = document.getElementById('topNotebooks');
    if (nbList) {
      nbList.innerHTML = stats.top_notebooks.map(nb => {
        const percent = ((nb.count / stats.total_notes) * 100).toFixed(1);
        const bgColor = getCategoryColor(nb.name);
        return `
          <li class="flex justify-between items-center px-3 py-1 rounded shadow-sm" style="background-color:${bgColor}">
            <span class="font-medium text-gray-800">${nb.name}</span>
            <span class="text-xs text-gray-600">(${nb.count} / ${percent}%)</span>
          </li>`;
      }).join('');
    }

    // Tags
    const tagRes = await fetch('/api/tags');
    const tagData = await tagRes.json();
    const sortedTags = tagData.sort((a, b) => b.count - a.count).slice(0, 10);
    const totalTagCount = tagData.reduce((sum, tag) => sum + tag.count, 0);

    const tagList = document.getElementById('topTags');
    tagList.innerHTML = sortedTags.map(tag => {
      const color = getTagColor(tag.name);
      const percent = ((tag.count / totalTagCount) * 100).toFixed(1);
      return `
        <li class="flex justify-between items-center px-3 py-1 rounded shadow-sm" style="background-color:${color}">
          <span class="font-medium text-gray-800">${tag.name}</span>
          <span class="text-xs text-gray-600">(${tag.count} / ${percent}%)</span>
        </li>`;
    }).join('');

    // Recent notes
    const noteRes = await fetch('/api/notes?limit=10');
    const notes = await noteRes.json();
    renderTopCategories(notes);
    loadNotebookStats();
	


  } catch (err) {
    console.error('❌ Dashboard 載入失敗：', err);
    document.getElementById('main-content').innerHTML = `
      <div class="text-red-600 p-6">
        ❌ Dashboard 載入失敗，請稍後再試。
        <pre class="text-xs mt-2">${err.message}</pre>
      </div>`;
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

function renderTopCategories(notes) {
  const counts = {};
  notes.forEach(n => {
    const cat = n.category_name?.trim();
    if (cat) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const topList = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const listDiv = document.getElementById('topCategories');
  listDiv.innerHTML = topList.map(([cat, count]) => {
    const percent = ((count / total) * 100).toFixed(1);
    const bgColor = getCategoryColor(cat);
    return `
      <li class="flex justify-between items-center px-3 py-1 rounded shadow-sm" style="background-color:${bgColor}">
        <span class="font-medium text-gray-800">${cat}</span>
        <span class="text-xs text-gray-600">(${count} / ${percent}%)</span>
      </li>`;
  }).join('');
}



async function loadNotebookStats() {
  try {
    const res = await fetch('/api/notebook_stats');
    const notebooks = await res.json();


    const container = document.getElementById('notebookAnalysis');
    container.innerHTML = '';  // 清空舊內容

    notebooks.forEach(nb => {
		const lastUpdatedHTML = nb.last_updated
		  ? `<div>Last Updated: ${formatRelativeTime(nb.last_updated)}</div>`  // 用人性化時間
		  : '';
		
      const tagsHTML = nb.tags.map(tag =>
        `<li class="flex justify-between">
          <span>${tag.name}</span>
          <span class="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">${tag.count}</span>
        </li>`).join('');

      const categoriesHTML = nb.categories.map(cat =>
        `<li class="flex justify-between">
          <span>${cat.name}</span>
          <span class="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">${cat.count}</span>
        </li>`).join('');

      const cardHTML = `
      <div class="rounded-xl border border-gray-200 p-4 bg-white space-y-4">
		<div class="flex items-center gap-2">
		  <i data-lucide="book-open" class="w-5 h-5 text-indigo-500"></i>
		  <a href="#notetree?notebook=${nb.id}" class="font-semibold text-gray-700 text-lg hover:underline">
			${nb.name}
		  </a>
		</div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-gray-500 text-sm mb-1 flex items-center gap-1">
              <i data-lucide="tag" class="w-4 h-4"></i> Tags
            </div>
            <ul class="space-y-1">${tagsHTML}</ul>
          </div>
          <div>
            <div class="text-gray-500 text-sm mb-1 flex items-center gap-1">
              <i data-lucide="layers" class="w-4 h-4"></i> Categories
            </div>
            <ul class="space-y-1">${categoriesHTML}</ul>
          </div>
        </div>
        <div class="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-dashed">
          <div class="flex items-center gap-1 text-blue-600">
            <i data-lucide="file-text" class="w-4 h-4"></i> ${nb.total_notes} Notes
          </div>
          <div> ${lastUpdatedHTML}</div>
        </div>
      </div>`;

      container.insertAdjacentHTML('beforeend', cardHTML);
    });

    lucide.createIcons();  // 重新渲染 lucide icons
  } catch (err) {
    console.error('❌ 無法載入 Notebook Stats:', err);
  }
}


function getTagColor(tag) {
  const hash = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

function getCategoryColor(cat) {
  return getTagColor(cat);
}

export async function onAfter() {
  console.log('[📊] Dashboard loaded.');
}

export async function onError(err) {
  console.error('[📊] Dashboard 發生錯誤：', err);
}

// 其餘 helper 保持不變...
