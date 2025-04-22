// ===== theme.js =====

// 取得當前主題
export function getTheme() {
  return sessionStorage.getItem('selectedTheme') || localStorage.getItem('selectedTheme') || 'default';
}

// 套用主題樣式
export function applyTheme(theme) {
  const sidebar = document.getElementById('sidebar');
  const header = document.querySelector('header');

  // 清除原有背景樣式
  sidebar.className = 'w-64 p-4 overflow-y-auto hidden lg:block transition-all duration-300 ease-in-out';
  header.className = 'hidden lg:flex justify-between items-center px-6 py-1.5 shadow-sm';

  // 加上主題樣式
  switch (theme) {
    case 'spring':
      header.classList.add('bg-pink-100');
      sidebar.classList.add('bg-pink-50/80', 'backdrop-blur');
      break;
    case 'summer':
      header.classList.add('bg-sky-100');
      sidebar.classList.add('bg-sky-50/80', 'backdrop-blur');
      break;
    case 'autumn':
      header.classList.add('bg-orange-100');
      sidebar.classList.add('bg-orange-50/80', 'backdrop-blur');
      break;
    case 'winter':
      header.classList.add('bg-blue-100');
      sidebar.classList.add('bg-blue-50/80', 'backdrop-blur');
      break;
    default:
      sidebar.classList.add('bg-white');
      header.classList.add('bg-white');
  }
}

// 更新主題 UI
export function updateThemeUI() {
  const theme = getTheme();
  applyTheme(theme);
}

// 初始化主題選單
export function initThemeHandler() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const modal = document.getElementById('themeModal');

  toggleBtn?.addEventListener('click', () => {
    modal.classList.toggle('hidden');
  });

  document.querySelectorAll('#themeModal button[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      localStorage.setItem('selectedTheme', theme);
      sessionStorage.setItem('selectedTheme', theme);
      applyTheme(theme);
      modal.classList.add('hidden');
    });
  });
}
