export async function init() {
  console.log('[📊] 初始化 Dashboard');
	

	
  try {
    const statsRes = await fetch('/api/dashboard');
    const stats = await statsRes.json();

    // 更新 Overview Cards
    document.getElementById('statTotal').textContent = stats.total_notes;
    document.getElementById('statCategories').textContent = stats.unique_categories;
    document.getElementById('statTags').textContent = stats.unique_tags;
    document.getElementById('statLastUpdated').textContent = formatRelativeTime(stats.last_updated);

    // Tags 統計
    const tagRes = await fetch('/api/tags');
    const tagData = await tagRes.json();
    const sortedTags = tagData.sort((a, b) => b.count - a.count).slice(0, 20);
    const totalTagCount = tagData.reduce((sum, tag) => sum + tag.count, 0);

    // Top Tags
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

    // Chart
    const ctx = document.getElementById('tagChart');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: sortedTags.map(t => t.name),
        datasets: [{
          data: sortedTags.map(t => t.count),
          backgroundColor: sortedTags.map(t => getTagColor(t.name))
        }]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                const count = context.parsed;
                const label = context.label;
                const percent = ((count / totalTagCount) * 100).toFixed(1);
                return `${label}: ${count} (${percent}%)`;
              }
            }
          },
          legend: { position: 'bottom' }
        }
      }
    });

    // Recent Notes
    const noteRes = await fetch('/api/notes?limit=10');
    const notes = await noteRes.json();
    const list = document.getElementById('recentNoteList');
    list.innerHTML = '';
    renderNoteList(notes, list, getTagColor);

    // Top Categories
    renderTopCategories(notes);

    // Limit control
    document.querySelectorAll('.limit-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const n = btn.dataset.limit;
        const r = await fetch(`/api/notes?limit=${n}`);
        const notes = await r.json();
        list.innerHTML = '';
        renderNoteList(notes, list, getTagColor);
        renderTopCategories(notes);
      });
    });

  } catch (err) {
    console.error('❌ Dashboard 載入失敗：', err);
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
    const cat = n.category?.trim();
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

function renderNoteList(notes, list, getTagColor) {
  list.innerHTML = '';
  notes.forEach(note => {
    const li = document.createElement('li');
    li.className = 'p-3 rounded-lg bg-white shadow-sm hover:shadow-md transition space-y-1 cursor-pointer';

    const time = new Date(note.created_at).toLocaleString('sv-SE').replace(' ', '&nbsp;');
    const category = `<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">${note.category}</span>`;

    let tagHTML = '';
    try {
      const tags = Array.isArray(note.tags) ? note.tags : JSON.parse(note.tags || '[]');
      tagHTML = tags.map(tag => {
        const color = getTagColor(tag);
        return `<span class="text-xs px-2 py-0.5 rounded" style="background-color:${color}">${tag}</span>`;
      }).join(' ');
    } catch { }

    li.innerHTML = `
	  <div class="flex justify-between items-center flex-wrap gap-2 text-xs">
		<div class="flex flex-wrap gap-2 items-center">${category} ${tagHTML}</div>
		<div class="flex items-center gap-2 whitespace-nowrap">
		  <button class="text-blue-500 hover:underline edit-btn">✏️ Edit</button>
		  <button class="text-red-500 hover:underline delete-btn">🗑 Delete</button>
		  <span class="text-gray-400">
			🧑 ${note.userid || 'anonymous'} ・ ${time}
		  </span>
		</div>
      </div>
      <div class="text-sm font-semibold text-gray-800 truncate">${note.title}</div>
      <div class="text-sm text-gray-600 preview">${note.content.replace(/<[^>]+>/g, '').slice(0, 100)}...</div>
      <div class="text-sm text-gray-700 hidden full">${note.content}</div>
    `;

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
        if (res.ok) li.remove();
      }
    });

    li.addEventListener('click', () => {
      li.querySelector('.preview')?.classList.toggle('hidden');
      li.querySelector('.full')?.classList.toggle('hidden');
    });

    list.appendChild(li);
  });
}

// 顏色對應
function getTagColor(tag) {
  const hash = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 85%)`;
}
function getCategoryColor(cat) {
  return getTagColor(cat);
}
