let allNotes = [];
let fuseTitle = null;
let fuseTag = null;
let fuseContent = null;

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

async function initFuzzyModal() {
  try {
    const res = await fetch('/api/notes');
    allNotes = await res.json();

    fuseTitle = new Fuse(allNotes, {
      includeScore: true,
      threshold: 0.4,
      keys: ['title']
    });
    fuseTag = new Fuse(allNotes, {
      includeScore: true,
      threshold: 0.4,
      keys: ['tags']
    });
    fuseContent = new Fuse(allNotes, {
      includeScore: true,
      threshold: 0.4,
      keys: ['content']
    });
  } catch (err) {
    console.error('❌ 無法載入資料：', err);
  }

  document.getElementById('globalSearchBtn')?.addEventListener('click', () => {
    document.getElementById('fuzzyModal').classList.remove('hidden');
    document.getElementById('fuzzySearchInput').focus();
  });

  document.getElementById('fuzzyModalClose')?.addEventListener('click', () => {
    document.getElementById('fuzzyModal').classList.add('hidden');
  });

  document.getElementById('fuzzySearchInput')?.addEventListener('input', e => {
    const keyword = e.target.value.trim();
    const resultList = document.getElementById('fuzzyResults');

    if (!keyword) {
      resultList.innerHTML = '<li class="text-gray-400 px-2 py-4 text-center">Start typing to search...</li>';
      return;
    }

    const titleMatches = fuseTitle.search(keyword).slice(0, 10);
    const tagMatches = fuseTag.search(keyword).slice(0, 10);
    const contentMatches = fuseContent.search(keyword).slice(0, 10);

    const buildItems = (matches) => matches.map(({ item }) => {
      const cat = item.category_name || 'Uncategorized';
      const catColor = getCategoryColor(cat);
      const book = item.notebook_name || 'Default';
      const bookColor = getNotebookColor(book);

      return `
        <li class="flex justify-between items-center px-3 py-2 hover:bg-gray-100 cursor-pointer" data-id="${item.id}">
          <div class="flex-1">
            <div class="font-medium text-gray-800 truncate">${item.title}</div>
            <div class="text-xs text-gray-500 truncate">${item.content.replace(/<[^>]+>/g, '').slice(0, 80)}...</div>
          </div>
          <div class="flex flex-col gap-1 ml-4">
            <span class="text-xs text-gray-700 px-2 py-0.5 rounded-full" style="background-color:${bookColor}">${book}</span>
            <span class="text-xs text-gray-700 px-2 py-0.5 rounded-full" style="background-color:${catColor}">${cat}</span>
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
        sessionStorage.setItem('currentNoteId', id);
        document.getElementById('fuzzyModal').classList.add('hidden');
        window.location.hash = '#note-editor';
        window.dispatchEvent(new Event('popstate'));
      });
    });
  });
}

window.addEventListener('DOMContentLoaded', initFuzzyModal);
