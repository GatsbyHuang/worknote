// js/pages/setting.js
export function init() {
  console.log('[Init] setting');

  const defaultCategory = document.querySelector('#defaultCategory');
  const defaultTags = document.querySelector('#defaultTags');
  const autoSaveToggle = document.getElementById('autoSaveToggle');

  const getSetting = key => localStorage.getItem(key);
  const saveSetting = (key, value) => localStorage.setItem(key, value);

  // 初始設定
  if (getSetting('defaultCategory')) {
    defaultCategory.value = getSetting('defaultCategory');
  }
  if (getSetting('defaultTags')) {
    defaultTags.value = getSetting('defaultTags');
  }
  autoSaveToggle.checked = getSetting('autoSave') === 'true';

  // 儲存變更
  defaultCategory.addEventListener('change', () => {
    saveSetting('defaultCategory', defaultCategory.value);
  });

  defaultTags.addEventListener('input', () => {
    saveSetting('defaultTags', defaultTags.value);
  });

  autoSaveToggle.addEventListener('change', () => {
    saveSetting('autoSave', autoSaveToggle.checked);
  });

  // 匯出按鈕
  document.getElementById('exportBtn')?.addEventListener('click', async () => {
    const res = await fetch('/api/notes');
    const notes = await res.json();
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // 匯入按鈕（未實作）
  document.getElementById('importBtn')?.addEventListener('click', () => {
    alert('📦 匯入功能尚未實作（可擴充 JSON 解析）');
  });

  // 全部清除按鈕（本地）
  document.getElementById('clearBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all local data?')) {
      localStorage.clear();
      alert('🗑️ All local settings cleared.');
    }
  });
}
