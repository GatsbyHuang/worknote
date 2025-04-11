// js/router.js


async function loadPage(path) {
  const content = await fetch(`pages/${path}.html`).then(res => res.text());
  document.getElementById('main-content').innerHTML = content;
  window.history.pushState({}, '', `#${path}`);

  try {
    const module = await import(`./pages/${path}.js`);
    module.init?.(); // 每頁的 init()
  } catch (e) {
    console.warn(`[router] 無 JS 模組對應：${path}`);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const defaultPage = location.hash?.slice(1) || 'dashboard';
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
  const path = location.hash?.slice(1) || 'dashboard';
  loadPage(path);
});
