let notebookDataMap = {}; // { notebook_id: { categories: [...], tags: [...], users: [...] } }

export async function init() {
  console.log('📤 Initializing Export Page...');

  await loadNotebookList();

  // 初次初始化為空
  updateLinkedFilters([]);

  document.getElementById('previewBtn')?.addEventListener('click', previewExport);
  document.getElementById('exportBtn')?.addEventListener('click', executeExport);
}

async function loadNotebookList() {
  const container = document.getElementById('notebookList');
  container.innerHTML = '<li class="text-gray-400">Loading...</li>';
  try {
    const res = await fetch('/api/export/export_full');
    const data = await res.json();
    container.innerHTML = '';
    notebookDataMap = {};

    data.forEach(notebook => {
      const li = document.createElement('li');
      li.textContent = notebook.name;
      li.dataset.value = notebook.id;
      li.className = 'cursor-pointer px-2 py-1 rounded hover:bg-blue-100';
      li.addEventListener('click', () => {
        li.classList.toggle('bg-blue-200');
        li.classList.toggle('font-semibold');
        const selected = getSelectedValuesFromList('notebookList');
        updateLinkedFilters(selected);
      });
      container.appendChild(li);

      notebookDataMap[notebook.id] = {
        categories: notebook.categories || [],
        tags: notebook.tags || [],
        users: notebook.users || []
      };
    });
  } catch (err) {
    console.error('❌ Failed to load notebooks', err);
  }
}

// 🔄 依據選取的 notebook 動態更新 tags / categories / users
function updateLinkedFilters(selectedNotebookIds) {
  const collect = (type) => {
    const seen = new Set();
    const result = [];
    selectedNotebookIds.forEach(id => {
      const items = notebookDataMap[id]?.[type] || [];
      items.forEach(item => {
        const key = item.id || item.name;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      });
    });
    return result;
  };

  updateFilterList('categoryList', collect('categories'), 'id', 'name');
  updateFilterList('tagList', collect('tags'), 'name', 'name');
  updateFilterList('userList', collect('users'), 'id', 'name');
}

function updateFilterList(containerId, listData, valueKey, textKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  listData.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item[textKey];
    li.dataset.value = item[valueKey];
    li.className = 'cursor-pointer px-2 py-1 rounded hover:bg-blue-100';
    li.addEventListener('click', () => {
      li.classList.toggle('bg-blue-200');
      li.classList.toggle('font-semibold');
    });
    container.appendChild(li);
  });
}

function getSelectedValuesFromList(id) {
  return Array.from(document.querySelectorAll(`#${id} li.bg-blue-200`))
    .map(li => li.dataset.value);
}

function getExportPayload() {
  return {
    notebooks: getSelectedValuesFromList('notebookList'),
    tags: getSelectedValuesFromList('tagList'),
    categories: getSelectedValuesFromList('categoryList'),
    userids: getSelectedValuesFromList('userList'),
    mode: document.querySelector('input[name="matchMode"]:checked')?.value || 'any'
  };
}

async function previewExport() {
  const previewBtn = document.getElementById('previewBtn');
  previewBtn.disabled = true;
  previewBtn.classList.add('opacity-50', 'cursor-not-allowed');

  const payload = getExportPayload();

  if (payload.notebooks.length === 0) {
    alert('⚠️ 請至少選擇一個 Notebook！');
    previewBtn.disabled = false;
    previewBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    return;
  }

  try {
    const res = await fetch('/api/export/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    document.getElementById('noteCount').textContent = data.count ?? '0';
  } catch (err) {
    console.error('❌ Preview failed', err);
    alert('❌ Failed to preview export');
  } finally {
    previewBtn.disabled = false;
    previewBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

async function executeExport() {
  const exportBtn = document.getElementById('exportBtn');
  exportBtn.disabled = true;
  exportBtn.classList.add('opacity-50', 'cursor-not-allowed');

  const payload = getExportPayload();

  if (payload.notebooks.length === 0) {
    alert('⚠️ 請至少選擇一個 Notebook！');
    exportBtn.disabled = false;
    exportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    return;
  }

  try {
    const res = await fetch('/api/export/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.filename) {
      document.getElementById('exportMessage').textContent = `✅ Exported to file: ${data.filename}`;
    } else {
      alert('❌ Export failed');
    }
  } catch (err) {
    console.error('❌ Export failed', err);
    alert('❌ Export failed');
  } finally {
    exportBtn.disabled = false;
    exportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}
