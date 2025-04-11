// js/pages/archive.js
export function init() {
  console.log('[Init] archive');

  const listContainer = document.getElementById('archiveList');
  const searchInput = document.getElementById('archiveSearch');
  const categoryFilter = document.getElementById('archiveCategory');
  const sortSelect = document.getElementById('archiveSort');

  let archivedNotes = [];

  fetch('/api/notes?archived=1')
    .then(res => res.json())
    .then(data => {
      archivedNotes = data;
      applyFilters();
    });

  function hashTagToColor(tag) {
    const hash = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 85%)`;
  }

  function renderList(data) {
    listContainer.innerHTML = '';
    if (!data.length) {
      listContainer.innerHTML = '<p class="text-gray-400">No archived notes found.</p>';
      return;
    }

    data.forEach(note => {
      const div = document.createElement('div');
      div.className = 'bg-white p-4 rounded-lg shadow-sm hover:shadow transition';
      div.innerHTML = `
        <div class="flex justify-between items-center mb-1">
          <h3 class="text-lg font-semibold text-gray-800">${note.title}</h3>
          <div class="space-x-2 text-sm">
            <button class="text-blue-500 hover:underline restore-btn">♻️ Restore</button>
            <button class="text-red-500 hover:underline delete-btn">🗑 Delete</button>
          </div>
        </div>
        <div class="text-sm text-gray-600 mb-2">
          <span class="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 mr-2">${note.category}</span>
          <span>${note.created_at?.slice(0, 10)}</span>
        </div>
        <p class="text-gray-700 mb-2">${note.content.replace(/<[^>]+>/g, '').slice(0, 80)}...</p>
        <div class="flex gap-2 flex-wrap">
          ${(() => {
            try {
              const tags = JSON.parse(note.tags || '[]');
              return tags.map(tag =>
                `<span class="text-xs px-2 py-1 rounded" style="background-color: ${hashTagToColor(tag)}">${tag}</span>`
              ).join('');
            } catch {
              return '';
            }
          })()}
        </div>
      `;

      div.querySelector('.restore-btn')?.addEventListener('click', async () => {
        const res = await fetch(`/api/notes/${note.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: 0 })
        });
        if (res.ok) {
          archivedNotes = archivedNotes.filter(n => n.id !== note.id);
          applyFilters();
        }
      });

      div.querySelector('.delete-btn')?.addEventListener('click', async () => {
        if (confirm(`Delete note "${note.title}" permanently?`)) {
          await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
          archivedNotes = archivedNotes.filter(n => n.id !== note.id);
          applyFilters();
        }
      });

      listContainer.appendChild(div);
    });
  }

  function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    const sort = sortSelect.value;

    let result = archivedNotes.filter(note => {
      const inCategory = category ? note.category === category : true;
      const inSearch = keyword
        ? note.title.toLowerCase().includes(keyword) ||
          JSON.parse(note.tags || '[]').some(tag => tag.toLowerCase().includes(keyword))
        : true;
      return inCategory && inSearch;
    });

    if (sort === 'newest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'oldest') result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sort === 'az') result.sort((a, b) => a.title.localeCompare(b.title));

    renderList(result);
  }

  searchInput.addEventListener('input', applyFilters);
  categoryFilter.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', applyFilters);
}
