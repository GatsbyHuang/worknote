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
  await loadList('/api/tags', 'tagList', 'name', 'name');
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
  const previewBtn = document.getElementById('previewBtn');
  previewBtn.disabled = true;
  previewBtn.classList.add('opacity-50', 'cursor-not-allowed');

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

  // 🚨 若都沒選任何條件，直接擋下
  const noConditionSelected =
    payload.notebooks.length === 0 &&
    payload.tags.length === 0 &&
    payload.categories.length === 0 &&
    payload.userids.length === 0;

  if (noConditionSelected) {
    alert('⚠️ 請至少選擇一個 Notebook / Tag / Category / User 條件才能匯出！');
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


