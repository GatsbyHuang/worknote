// export.js

export async function fetchOptions(endpoint, selectId) {
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`❌ Failed to fetch ${endpoint}`);
    const data = await res.json();

    const select = document.getElementById(selectId);
    if (!select) {
      console.warn(`[warn] DOM #${selectId} not found`);
      return;
    }

    select.innerHTML = ''; // 清空舊選項
    data.forEach(item => {
      const option = document.createElement('option');
      option.value = item.name || item;
      option.textContent = item.name || item;
      select.appendChild(option);
    });
  } catch (err) {
    console.error(`fetchOptions error for ${endpoint}`, err);
  }
}

function getSelectedValues(selectId) {
  const el = document.getElementById(selectId);
  if (!el) return [];
  return Array.from(el.selectedOptions).map(opt => opt.value);
}

function getExportPayload() {
  return {
    tags: getSelectedValues('filterTags'),
    categories: getSelectedValues('filterCategories'),
    userids: getSelectedValues('filterUserIDs'),
    mode: document.querySelector('input[name="matchMode"]:checked')?.value || 'any'
  };
}

export function init() {
  console.log('📤 Initializing Export Page...');
  fetchOptions('/api/tags', 'filterTags');
  fetchOptions('/api/categories', 'filterCategories');
  fetchOptions('/api/export/users', 'filterUserIDs');

  document.getElementById('previewBtn')?.addEventListener('click', async () => {
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
  });

  document.getElementById('exportBtn')?.addEventListener('click', async () => {
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
  });
}
