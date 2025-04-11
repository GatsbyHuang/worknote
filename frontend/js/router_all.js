
function getTagColor(tag) {
  alert("a")
  const hash = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 85%)`; // 可調亮度、飽和度
}

async function loadPage(path) {
  const content = await fetch(`pages/${path}.html`).then(res => res.text());
  document.getElementById('main-content').innerHTML = content;
  window.history.pushState({}, '', `#${path}`);

  const saveSetting = (key, value) => localStorage.setItem(key, value);
  const getSetting = (key) => localStorage.getItem(key);

  const mockArchivedNotes = [
    {
      id: 101,
      title: 'Deprecated Nginx Config',
      content: '這是一段過期的 Nginx 設定...',
      tags: ['nginx', 'server'],
      category: 'Server',
      created_at: '2023-09-10',
    },
    {
      id: 102,
      title: '舊版 Crontab 定時任務',
      content: '這份排程已不再使用...',
      tags: ['cron', 'script'],
      category: 'Script',
      created_at: '2023-10-01',
    }
  ];

  const mockNotes = [
	{
	  id: 1,
	  title: 'Cassandra 高可用設定',
	  content: '設定 seed node 與 replication factor 是維持可用性重要關鍵...',
	  tags: ['cassandra', 'replication'],
	  category: 'DB',
	  created_at: '2024-11-01',
	},
	{
	  id: 2,
	  title: 'Linux crontab 小技巧',
	  content: '使用 crontab -e 編輯排程，每分鐘執行可用 */1 * * * * 指令...',
	  tags: ['linux', 'script'],
	  category: 'Script',
	  created_at: '2024-11-03',
	},
	{
	  id: 3,
	  title: 'Nginx Proxy 設定',
	  content: '利用 reverse proxy 與負載平衡設定 upstream server...',
	  tags: ['server', 'nginx'],
	  category: 'Server',
	  created_at: '2024-11-05',
	},
  ];




  const hashTagToColor = tag => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 85%)`;
  };

  //note-editor page
if (path === 'note-editor') {
  tinymce?.remove();
  tinymce.init({
    selector: '#editor',
    plugins: 'code codesample link image lists',
    toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | codesample | link image | code',
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

  const id = sessionStorage.getItem('currentNoteId');
  if (id) {
    console.log(`📝 Edit mode: load note ${id}`);
    // TODO: 載入筆記內容（可擴充）
  }

  // 儲存邏輯
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const title = document.getElementById('noteTitle').value.trim();
      const category = document.getElementById('categorySelect').value.trim();
      const content = tinymce.get('editor').getContent();

      // 安全抓取 tag
      const tags = Array.from(document.querySelectorAll('#tagContainer span'))
        .map(el => {
          for (let node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.trim();
          }
          return null;
        })
        .filter(Boolean);

      console.log('🧠 擷取到的 tags:', tags);

      if (!title || !content) {
        return alert("請填寫標題與內容！");
      }

      const payload = {
        title,
        category,
        tags,
        content,
        created_at: new Date().toISOString()
      };

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("✅ 筆記已儲存！");
        sessionStorage.removeItem('currentNoteId');
        loadPage('history');
      } else {
        alert("❌ 儲存失敗！");
      }
    });
  }
}

 //history
if (path === 'history') {


  setTimeout(async () => {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('filterCategory');
    const sortSelect = document.getElementById('sortSelect');
    const clearBtn = document.getElementById('clearFilters');
    const fuzzyBox = document.getElementById('fuzzySearchBox');
    const fuzzyInput = document.getElementById('fuzzyInput');
    const container = document.getElementById('noteList');

    let allNotes = [];

    try {
      const res = await fetch('/api/notes');
      allNotes = await res.json();
    } catch (e) {
      console.error('❌ 無法取得筆記：', e);
    }

    const fuse = new Fuse(allNotes, {
      keys: ['title', 'tags'],
      threshold: 0.3,
    });

    function renderNotes(notes) {
      container.innerHTML = '';
      if (!notes.length) {
        container.innerHTML = '<p class="text-gray-400">No matching notes.</p>';
        return;
      }
	  
      notes.forEach(note => {
		console.log(note)
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-lg shadow hover:shadow-md transition';
		console.log('[DEBUG] 渲染筆記:', note.title);
        div.innerHTML = `
          <div class="flex justify-between items-center mb-1">
            <h3 class="text-lg font-semibold text-gray-800">${note.title}</h3>
            <div class="space-x-2">
              <button class="text-blue-500 hover:underline edit-btn">✏️ Edit</button>
              <button class="text-red-500 hover:underline delete-btn">🗑 Delete</button>
            </div>
          </div>
          <div class="text-sm text-gray-600 mb-2">
            <span class="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 mr-2">${note.category}</span>
            <span>${note.created_at?.slice(0, 10)}</span>
          </div>
          <p class="text-gray-700 mb-2">${note.content.replace(/<[^>]+>/g, '').slice(0, 100)}...</p>
			<div class="flex flex-wrap gap-2 mt-2">
			  ${
				  (() => {
					  try {
						console.log('[🐛 DEBUG] 原始 tags:', note.tags);
						const tags = JSON.parse(note.tags || '[]');
						console.log('[✅ DEBUG] 轉成陣列:', tags);

						return tags.map(tag => {
						  const color = getTagColor(tag);
						  alert(color); // 測試呼叫
						  return `<span class="text-xs px-2 py-1 rounded text-gray-800" style="background-color:${color}">${tag}</span>`;
						}).join('');
					  } catch (err) {
						console.warn('[❌ parse tags 錯誤]', err);
						return '';
					  }
					})()

				  
				  
			  }
			</div>
        `;

        // 編輯事件
        div.querySelector('.edit-btn')?.addEventListener('click', () => {
          sessionStorage.setItem('currentNoteId', note.id);
          loadPage('note-editor');
        });

        // 刪除事件
        div.querySelector('.delete-btn')?.addEventListener('click', async () => {
          if (confirm(`確定刪除「${note.title}」？`)) {
            const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
            if (res.ok) {
              allNotes = allNotes.filter(n => n.id !== note.id);
              applyFilters();
            }
          }
        });

        container.appendChild(div);
      });
    }

    function applyFilters() {
      const keyword = searchInput.value.toLowerCase();
      const category = categoryFilter.value;
      const sort = sortSelect.value;

      let filtered = allNotes.filter(note => {
        const matchCategory = category ? note.category === category : true;
        const matchKeyword = keyword
          ? note.title.toLowerCase().includes(keyword) ||
            JSON.parse(note.tags || '[]').some(tag => tag.toLowerCase().includes(keyword))
          : true;
        return matchCategory && matchKeyword;
      });

      if (sort === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (sort === 'oldest') {
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      } else if (sort === 'az') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      }

      renderNotes(filtered);
    }

    // 🔍 即時搜尋欄位
    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
    sortSelect.addEventListener('change', applyFilters);
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      categoryFilter.value = '';
      sortSelect.value = 'newest';
      applyFilters();
    });

    // Ctrl+F 觸發全文搜尋框
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        fuzzyBox.classList.remove('hidden');
        fuzzyInput.focus();
      } else if (e.key === 'Escape') {
        fuzzyBox.classList.add('hidden');
        fuzzyInput.value = '';
      }
    });

    fuzzyInput.addEventListener('input', () => {
      const keyword = fuzzyInput.value;
      if (!keyword) {
        fuzzyBox.classList.add('hidden');
        applyFilters();
      } else {
        const result = fuse.search(keyword).map(r => r.item);
        renderNotes(result);
      }
    });

    applyFilters();
  }, 100);
}

  
  //tags
  if (path === 'tags') {

    const tagCount = {};
    mockNotes.forEach(note => {
      note.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    const renderChart = (data) => {
      const ctx = document.getElementById('tagChart');
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: data.map(d => d[0]),
          datasets: [{
            data: data.map(d => d[1]),
            backgroundColor: data.map(d => hashTagToColor(d[0])),
          }]
        },
        options: {
          plugins: {
            legend: {
              position: 'bottom',
            }
          }
        }
      });
    };

    const showTagNotes = (tag) => {
      const notes = mockNotes.filter(note => note.tags.includes(tag));
      const section = document.getElementById('tagNotesSection');
      const noteList = document.getElementById('tagNoteList');
      const active = document.getElementById('activeTag');

      active.textContent = tag;
      noteList.innerHTML = '';

      notes.forEach(note => {
        const li = document.createElement('li');
        li.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow transition cursor-pointer';
        li.innerHTML = `
          <div class="font-semibold text-gray-800">${note.title}</div>
          <div class="text-sm text-gray-600 mt-1 preview">${note.content.slice(0, 80)}...</div>
          <div class="text-sm text-gray-700 mt-2 hidden full">${note.content}</div>
        `;
        li.addEventListener('click', () => {
          li.querySelector('.preview')?.classList.toggle('hidden');
          li.querySelector('.full')?.classList.toggle('hidden');
        });
        noteList.appendChild(li);
      });

      section.classList.remove('hidden');
    };

    const renderTags = (filter = '', sort = 'az') => {
      const tagList = document.getElementById('tagList');
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
        card.innerHTML = `
          <div class="font-medium text-gray-800">${tag}</div>
          <div class="text-sm text-gray-600">Used in ${count} notes</div>
        `;
        card.style.backgroundColor = hashTagToColor(tag);
        card.addEventListener('click', () => showTagNotes(tag));
        tagList.appendChild(card);
      });

      renderChart(entries);
    };

    renderTags();

    document.getElementById('tagSearchInput')?.addEventListener('input', e => {
      const sort = document.getElementById('tagSortSelect').value;
      renderTags(e.target.value, sort);
    });

    document.getElementById('tagSortSelect')?.addEventListener('change', e => {
      const filter = document.getElementById('tagSearchInput').value;
      renderTags(filter, e.target.value);
    });
  }
  
  // archive page
  if (path === 'archive') {
    setTimeout(() => {
      const listContainer = document.getElementById('archiveList');
      const searchInput = document.getElementById('archiveSearch');
      const categoryFilter = document.getElementById('archiveCategory');
      const sortSelect = document.getElementById('archiveSort');

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
              <span>${note.created_at}</span>
            </div>
            <p class="text-gray-700 mb-2">${note.content.slice(0, 80)}...</p>
            <div class="flex gap-2 flex-wrap">
              ${note.tags.map(tag => `<span class="text-xs px-2 py-1 rounded" style="background-color: ${hashTagToColor(tag)}">${tag}</span>`).join('')}
            </div>
          `;

          div.querySelector('.restore-btn').addEventListener('click', () => {
            alert(`Note "${note.title}" restored! (模擬回存至 history)`);
          });

          div.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm(`Delete note "${note.title}" permanently?`)) {
              const idx = mockArchivedNotes.findIndex(n => n.id === note.id);
              if (idx !== -1) mockArchivedNotes.splice(idx, 1);
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

        let result = mockArchivedNotes.filter(note => {
          const inCategory = category ? note.category === category : true;
          const inSearch = keyword
            ? note.title.toLowerCase().includes(keyword) ||
              note.tags.some(tag => tag.toLowerCase().includes(keyword))
            : true;
          return inCategory && inSearch;
        });

        if (sort === 'newest') {
          result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sort === 'oldest') {
          result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else if (sort === 'az') {
          result.sort((a, b) => a.title.localeCompare(b.title));
        }

        renderList(result);
      }

      searchInput.addEventListener('input', applyFilters);
      categoryFilter.addEventListener('change', applyFilters);
      sortSelect.addEventListener('change', applyFilters);

      renderList(mockArchivedNotes);
    }, 50);
  }
  //setting page
    if (path === 'setting') {
    setTimeout(() => {
      // 預設欄位
      const defaultCategory = document.querySelector('select');
      const defaultTags = document.querySelector('input[type="text"]');
      const autoSaveToggle = document.getElementById('autoSaveToggle');

      // 設定初始值
      if (getSetting('defaultCategory')) {
        defaultCategory.value = getSetting('defaultCategory');
      }
      if (getSetting('defaultTags')) {
        defaultTags.value = getSetting('defaultTags');
      }
      autoSaveToggle.checked = getSetting('autoSave') === 'true';

      // 綁定儲存
      defaultCategory.addEventListener('change', () => {
        saveSetting('defaultCategory', defaultCategory.value);
      });
      defaultTags.addEventListener('input', () => {
        saveSetting('defaultTags', defaultTags.value);
      });
      autoSaveToggle.addEventListener('change', () => {
        saveSetting('autoSave', autoSaveToggle.checked);
      });

      // 匯出
      document.querySelector('button:contains("Export")')?.addEventListener('click', () => {
        const data = localStorage.getItem('notesData') || '[]';
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'notes-backup.json';
        a.click();
        URL.revokeObjectURL(url);
      });

      // 匯入（模擬）
      document.querySelector('button:contains("Import")')?.addEventListener('click', () => {
        alert('📦 Importing from JSON is not implemented yet (demo only)');
      });

      // 清除全部資料
      document.querySelector('button:contains("Clear All Notes")')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all notes?')) {
          localStorage.removeItem('notesData');
          alert('🗑️ All notes cleared (mock)');
        }
      });
    }, 50);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const defaultPage = location.hash ? location.hash.slice(1) : 'dashboard';
  loadPage(defaultPage);

  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      loadPage(btn.dataset.page);
    });
  });

  const newBtn = document.getElementById('newNoteBtn');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      sessionStorage.removeItem('currentNoteId');
      loadPage('note-editor');
    });
  }

  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('hidden');
  });
});

window.addEventListener('popstate', () => {
  const path = location.hash ? location.hash.slice(1) : 'dashboard';
  loadPage(path);
});
