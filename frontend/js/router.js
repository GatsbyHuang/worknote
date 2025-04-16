// js/router.js

async function loadPage(path) {
  const basePath = path.split('?')[0];  // 🔧 保留純檔名部分
  const content = await fetch(`pages/${basePath}.html`).then(res => res.text());
  document.getElementById('main-content').innerHTML = content;
  window.history.pushState({}, '', `#${path}`);

  try {
    const module = await import(`./pages/${basePath}.js`);
    module.init?.(new URLSearchParams(path.split('?')[1] || '')); // ✅ 把 query 傳進去
  } catch (e) {
    console.warn(`[router] 無 JS 模組對應：${basePath}`);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const defaultPath = location.hash?.slice(1) || 'dashboard';
  loadPage(defaultPath);

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
  const path = location.hash?.slice(1) || 'dashboard';
  loadPage(path);
});
