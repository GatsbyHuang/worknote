export async function init() {
  console.log('📤 Initializing Export Page...');
  await loadNotebookList();
  await loadTagList();
  await loadCategoryList();
  await loadUserList();

  document.getElementById('previewBtn')?.addEventListener('click', previewExport);
  document.getElementById('exportBtn')?.addEventListener('click', executeExport);
}

async function loadNotebookList() {
  await loadList('/api/notebooks', 'notebookList', 'id', 'name');
}

async function loadTagList() {
  await loadList('/api/tags', 'tagList', 'count', 'name');
}

async function loadCategoryList() {
  await loadList('/api/categories', 'categoryList', 'id', 'name');
}

async function loadUserList() {
  await loadList('/api/export/users', 'userList');
}

async function loadList(url, targetId, valueKey = null, textKey = null) {
  const container = document.getElementById(targetId);
  container.innerHTML = '<li class="text-gray-400">Loading...</li>';
  try {
    const res = await fetch(url);
    const data = await res.json();

    container.innerHTML = '';
    data.forEach(item => {
      const val = valueKey ? item[valueKey] : item;
      const label = textKey ? item[textKey] : item;
      const li = document.createElement('li');
      li.textContent = label;
      li.dataset.value = val;
      li.className = 'cursor-pointer px-2 py-1 rounded hover:bg-blue-100';
      li.addEventListener('click', () => {
        li.classList.toggle('bg-blue-200');
        li.classList.toggle('font-semibold');
      });
      container.appendChild(li);
    });
  } catch (err) {
    console.error(`❌ Failed to load ${url}`, err);
  }
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
  const payload = getExportPayload();
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
  }
}

async function executeExport() {
  const payload = getExportPayload();
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
  }
}
