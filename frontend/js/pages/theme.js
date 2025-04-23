// ===== theme.js =====
import { initUserHandler } from './user.js';  // ⬅️ 引入主題

// 取得當前主題
export function getTheme() {
  return sessionStorage.getItem('selectedTheme') || localStorage.getItem('selectedTheme') || 'default';
}

// 套用主題樣式
export function applyTheme(theme) {
  const sidebar = document.getElementById('sidebar');
  const header = document.querySelector('header');
  const mobileHeader = document.querySelector('#mobile-header');
  const main = document.getElementById('main-content');
  const newNoteBtn = document.getElementById('newNoteBtn');

  // 清除原有背景樣式
  sidebar.className = 'w-64 p-4 overflow-y-auto hidden lg:block transition-all duration-300 ease-in-out';
  header.className = 'hidden lg:flex justify-between items-center px-6 py-1.5 shadow-sm';
  newNoteBtn.className = 'fixed bottom-6 right-6 z-50 text-white p-4 rounded-full shadow-md focus:outline-none transition-all';
  if (mobileHeader) mobileHeader.className = 'lg:hidden flex justify-between items-center px-4 py-2 shadow-md';
  if (main) main.className = 'flex-1 p-4 overflow-y-auto';

  // 加上主題樣式
  switch (theme) {
    case 'spring':
      //header.classList.add('bg-pink-100');
      header.classList.add('bg-gradient-to-r', 'from-pink-200', 'to-pink-100');  //漸層效果
      //sidebar.classList.add('bg-gradient-to-b', 'from-pink-50', 'to-pink-100');  //漸層效果
      sidebar.classList.add('bg-pink-100');
	  newNoteBtn.classList.add('bg-green-400', 'hover:bg-green-500');
      //if (main) main.classList.add('bg-pink-50/80');
      if (main) main.classList.add('bg-gradient-to-br', 'from-pink-50', 'to-pink-100');  //漸層效果
      if (mobileHeader) mobileHeader.classList.add('bg-pink-100'); 
	  addSeasonEffect('#season_div','🌸', 5);
      break;
    case 'summer':
      header.classList.add('bg-gradient-to-r', 'from-sky-200', 'to-sky-100');
      sidebar.classList.add('bg-sky-100');
	  newNoteBtn.classList.add('bg-teal-400', 'hover:bg-teal-500');
      if (main) main.classList.add('bg-gradient-to-br', 'from-sky-50', 'to-sky-100');  //漸層效果
	  if (mobileHeader) mobileHeader.classList.add('bg-sky-100');
      addSeasonEffect('#season_div','☀️', 5);
      break;
    case 'autumn':
      header.classList.add('bg-gradient-to-r', 'from-orange-200', 'to-orange-100');
      sidebar.classList.add('bg-orange-100');
      newNoteBtn.classList.add('bg-orange-400', 'hover:bg-orange-500');
	  if (main) main.classList.add('bg-gradient-to-br', 'from-orange-50', 'to-orange-100');  //漸層效果
      if (mobileHeader) mobileHeader.classList.add('bg-orange-100');
      addSeasonEffect('#season_div','🍂',5);
      break;
    case 'winter':
      header.classList.add('bg-gradient-to-r', 'from-blue-200', 'to-blue-100');
      sidebar.classList.add('bg-blue-100');
	  newNoteBtn.classList.add('bg-indigo-400', 'hover:bg-indigo-500');
      if (main) main.classList.add('bg-gradient-to-br', 'from-blue-50', 'to-blue-100');  //漸層效果
      if (mobileHeader) mobileHeader.classList.add('bg-blue-100');
      sidebar.classList.add('relative');
      addSeasonEffect('#season_div','❄️', 5);
	  break;
    default:
      sidebar.classList.add('bg-white');
      header.classList.add('bg-white');
	  newNoteBtn.classList.add('bg-slate-500', 'hover:bg-slate-600');
      if (main) main.classList.add('bg-white/50');
	  if (mobileHeader) mobileHeader.classList.add('bg-white'); 

  }
}

export function addSeasonEffect(selector = '.season-effect', symbol = '❄️', count = 10) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const flake = document.createElement('div');  // 改 div
    flake.className = 'flake';
    flake.textContent = symbol;
    flake.style.left = Math.random() * 100 + '%';
    flake.style.animationDelay = Math.random() * 10 + 's';
    flake.style.fontSize = `${Math.random() * 8 + 10}px`;  // 10~18px
    flake.style.opacity = Math.random() * 0.3 + 0.1;        // 0.1 ~ 0.4
    container.appendChild(flake);
  }
}


export function addSeasonEffect_old(symbol = '❄️', count = 10) {
  const container = document.querySelector('.season-effect');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const flake = document.createElement('div');
    flake.className = 'flake';
    flake.textContent = symbol;
    flake.style.left = Math.random() * 100 + '%';
    flake.style.animationDelay = Math.random() * 10 + 's';
    flake.style.fontSize = `${Math.random() * 8 + 10}px`; // 10~18px
    flake.style.opacity = Math.random() * 0.3 + 0.1;      // 0.1 ~ 0.4
    container.appendChild(flake);
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
	  initUserHandler()
      modal.classList.add('hidden');
    });
  });
}
