export function init() {
  console.log('[Init] tags');

  const tagList = document.getElementById('tagList');
  const searchInput = document.getElementById('tagSearchInput');
  const sortSelect = document.getElementById('tagSortSelect');
  const noteList = document.getElementById('tagNoteList');
  const tagNotesSection = document.getElementById('tagNotesSection');
  const activeTagLabel = document.getElementById('activeTag');
  const chartCtx = document.getElementById('tagChart');

  let allNotes = [];
  let tagCount = {};

  function hashTagToColor(tag) {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 85%)`;
  }

  async function fetchData() {
    const [tagRes, noteRes] = await Promise.all([
      fetch('/api/tags'),
      fetch('/api/notes')
    ]);

    const tags = await tagRes.json();
    allNotes = await noteRes.json();

    tagCount = tags.reduce((acc, item) => {
      acc[item.name] = item.count;
      return acc;
    }, {});

    renderTags();
  }

  function renderChart(data) {
    new Chart(chartCtx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d[0]),
        datasets: [{
          data: data.map(d => d[1]),
          backgroundColor: data.map(d => hashTagToColor(d[0]))
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  function renderTags(filter = '', sort = 'az') {
    tagList.innerHTML = '';
    let entries = Object.entries(tagCount).filter(([tag]) =>
      tag.toLowerCase().includes(filter.toLowerCase())
    );

    if (sort === 'az') entries.sort((a, b) => a[0].localeCompare(b[0]));
    if (sort === 'za') entries.sort((a, b) => b[0].localeCompare(a[0]));
    if (sort === 'count') entries.sort((a, b) => b[1] - a[1]);

    entries.forEach(([tag, count]) => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded-lg shadow-sm hover:shadow transition cursor-pointer';
      card.style.backgroundColor = hashTagToColor(tag);
      card.innerHTML = `
        <div class="font-medium text-gray-800">${tag}</div>
        <div class="text-sm text-gray-600">Used in ${count} notes</div>
      `;
      card.addEventListener('click', () => showTagNotes(tag));
      tagList.appendChild(card);
    });

    renderChart(entries);
  }

function showTagNotes(tag) {
  const notes = allNotes.filter(note => {
    try {
      const tags = Array.isArray(note.tags)
        ? note.tags
        : JSON.parse(note.tags || '[]');
      return tags.includes(tag);
    } catch {
      return false;
    }
  });

  activeTagLabel.textContent = tag;
  noteList.innerHTML = '';

  notes.forEach(note => {
    const li = document.createElement('li');
    li.className = 'p-3 rounded-lg bg-white shadow-sm hover:shadow transition space-y-1 cursor-pointer';

    const time = new Date(note.created_at).toLocaleString('sv-SE').replace(' ', '&nbsp;');
    const category = `<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">${note.category}</span>`;

    // 處理 tag badge
    let tagHTML = '';
    try {
      const tags = Array.isArray(note.tags)
        ? note.tags
        : JSON.parse(note.tags || '[]');
      tagHTML = tags.map(tag => {
        const color = hashTagToColor(tag);
        return `<span class="text-xs px-2 py-0.5 rounded" style="background-color:${color}">${tag}</span>`;
      }).join(' ');
    } catch (err) {
      console.warn('[⚠️ parse tag failed]', note.tags, err);
    }

    li.innerHTML = `
      <div class="flex justify-between items-center flex-wrap gap-2 text-xs">
        <div class="flex flex-wrap gap-2 items-center">
          ${category}
          ${tagHTML}
        </div>
        <div class="flex items-center gap-2 whitespace-nowrap">
          <button class="text-blue-500 hover:underline edit-btn">✏️ Edit</button>
          <button class="text-red-500 hover:underline delete-btn">🗑 Delete</button>
          <span class="text-gray-400">${time}</span>
        </div>
      </div>
      <div class="text-sm font-semibold text-gray-800 truncate">${note.title}</div>
      <div class="text-sm text-gray-600 preview">${note.content.replace(/<[^>]+>/g, '').slice(0, 100)}...</div>
      <div class="text-sm text-gray-700 full hidden">${note.content}</div>
    `;

    // 點 item 展開/收起
    li.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      li.querySelector('.preview')?.classList.toggle('hidden');
      li.querySelector('.full')?.classList.toggle('hidden');
    });

    // 編輯按鈕
    li.querySelector('.edit-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      sessionStorage.setItem('currentNoteId', note.id);
      window.location.hash = '#note-editor';
      window.dispatchEvent(new Event('popstate'));
    });

    // 刪除按鈕
    li.querySelector('.delete-btn')?.addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm(`確定刪除「${note.title}」？`)) {
        const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
        if (res.ok) {
          allNotes = allNotes.filter(n => n.id !== note.id);
          showTagNotes(tag); // 重新 render
        }
      }
    });

    noteList.appendChild(li);
  });

  tagNotesSection.classList.remove('hidden');
}


  searchInput?.addEventListener('input', e => {
    renderTags(e.target.value, sortSelect.value);
  });

  sortSelect?.addEventListener('change', e => {
    renderTags(searchInput.value, e.target.value);
  });

  fetchData();
}
