let allNotes = [];
let fuse = null;

// 分類配色函式
function getCategoryColor(cat) {
  if (!cat) return '#ddd';
  const hash = [...cat].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

async function initFuzzyModal() {
  try {
    const res = await fetch('/api/notes');
    allNotes = await res.json();

    fuse = new Fuse(allNotes, {
      includeScore: true,
      threshold: 0.4,
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'content', weight: 0.25 },
        { name: 'tags', weight: 0.25 },
      ],
    });
  } catch (err) {
    console.error('❌ 無法載入資料：', err);
  }

  // 開啟 Modal
  document.getElementById('globalSearchBtn')?.addEventListener('click', () => {
    document.getElementById('fuzzyModal').classList.remove('hidden');
    document.getElementById('fuzzySearchInput').focus();
  });

  // 關閉 Modal
  document.getElementById('fuzzyModalClose')?.addEventListener('click', () => {
    document.getElementById('fuzzyModal').classList.add('hidden');
  });

  // 搜尋事件
  document.getElementById('fuzzySearchInput')?.addEventListener('input', e => {
    const keyword = e.target.value.trim();
    const resultList = document.getElementById('fuzzyResults');

    if (!keyword || !fuse) {
      resultList.innerHTML = '<li class="text-gray-400 px-2 py-4 text-center">Start typing to search...</li>';
      return;
    }

    const results = fuse.search(keyword).slice(0, 30);
    if (!results.length) {
      resultList.innerHTML = '<li class="text-gray-400 px-2 py-4 text-center">No results found</li>';
      return;
    }

    resultList.innerHTML = results.map(({ item }) => {
      const cat = item.category || 'Uncategorized';
      const catColor = getCategoryColor(cat);
      return `
        <li class="flex justify-between items-center px-3 py-2 hover:bg-gray-100 cursor-pointer" data-id="${item.id}">
          <div class="flex-1">
            <div class="font-medium text-gray-800 truncate">${item.title}</div>
            <div class="text-xs text-gray-500 truncate">${item.content.replace(/<[^>]+>/g, '').slice(0, 80)}...</div>
          </div>
          <span class="ml-4 text-xs text-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap" style="background-color:${catColor}">
            ${cat}
          </span>
        </li>
      `;
    }).join('');

    // 點擊結果跳轉到 note-editor
    document.querySelectorAll('#fuzzyResults li')?.forEach(li => {
      li.addEventListener('click', () => {
        const id = li.dataset.id;
        sessionStorage.setItem('currentNoteId', id);
        document.getElementById('fuzzyModal').classList.add('hidden');
        window.location.hash = '#note-editor';
        window.dispatchEvent(new Event('popstate'));
      });
    });
  });
}

window.addEventListener('DOMContentLoaded', initFuzzyModal);
