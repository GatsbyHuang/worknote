// ===== theme.js =====
import { initUserHandler } from './user.js';  // ⬅️ 引入主題

let idleTimer = null;
let isIdle = false;
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

  sidebar.className = 'w-64 p-4 overflow-y-auto hidden lg:block transition-all duration-300 ease-in-out';
  header.className = 'hidden lg:flex justify-between items-center px-6 py-1.5 shadow-sm';
  newNoteBtn.className = 'fixed bottom-6 right-6 z-50 text-white p-4 rounded-full shadow-md focus:outline-none transition-all';
  if (mobileHeader) mobileHeader.className = 'lg:hidden flex justify-between items-center px-4 py-2 shadow-md';
  if (main) main.className = 'flex-1 p-4 overflow-y-auto';

  switch (theme) {
    case 'spring':
      header.classList.add('bg-gradient-to-r', 'from-pink-200', 'to-pink-100');
      sidebar.classList.add('bg-pink-100');
      newNoteBtn.classList.add('bg-green-400', 'hover:bg-green-500');
      if (main) main.classList.add('bg-gradient-to-br', 'from-pink-50', 'to-pink-100');
      if (mobileHeader) mobileHeader.classList.add('bg-pink-100'); 
      addSeasonEffect('#season_div','🌸', 5);
      break;
    case 'summer':
      header.classList.add('bg-gradient-to-r', 'from-sky-200', 'to-sky-100');
      sidebar.classList.add('bg-sky-100');
      newNoteBtn.classList.add('bg-teal-400', 'hover:bg-teal-500');
      if (main) main.classList.add('bg-gradient-to-br', 'from-sky-50', 'to-sky-100');
      if (mobileHeader) mobileHeader.classList.add('bg-sky-100');
      addSeasonEffect('#season_div','☀️', 5);
      break;
    case 'autumn':
      header.classList.add('bg-gradient-to-r', 'from-orange-200', 'to-orange-100');
      sidebar.classList.add('bg-orange-100');
      newNoteBtn.classList.add('bg-orange-400', 'hover:bg-orange-500');
      if (main) main.classList.add('bg-gradient-to-br', 'from-orange-50', 'to-orange-100');
      if (mobileHeader) mobileHeader.classList.add('bg-orange-100');
      addSeasonEffect('#season_div','🍂',5);
      break;
    case 'winter':
      header.classList.add('bg-gradient-to-r', 'from-blue-200', 'to-blue-100');
      sidebar.classList.add('bg-blue-100');
      newNoteBtn.classList.add('bg-indigo-400', 'hover:bg-indigo-500');
      if (main) main.classList.add('bg-gradient-to-br', 'from-blue-50', 'to-blue-100');
      if (mobileHeader) mobileHeader.classList.add('bg-blue-100');
      addSeasonEffect('#season_div','❄️', 5);
      break;
    default:
      sidebar.classList.add('bg-white');
      header.classList.add('bg-white');
      newNoteBtn.classList.add('bg-slate-500', 'hover:bg-slate-600');
      if (main) main.classList.add('bg-white/50');
      if (mobileHeader) mobileHeader.classList.add('bg-white'); 
  }

  setupIdleCharacter();  // ⭐ 加入閒置動畫
}

export function addSeasonEffect(selector = '.season-effect', symbol = '❄️', count = 10) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const flake = document.createElement('div');
    flake.className = 'flake';
    flake.textContent = symbol;
    flake.style.left = Math.random() * 100 + '%';
    flake.style.animationDelay = Math.random() * 10 + 's';
    flake.style.fontSize = `${Math.random() * 8 + 10}px`;
    flake.style.opacity = Math.random() * 0.3 + 0.1;
    container.appendChild(flake);
  }
}

// 🐾 加入閒置角色
export function setupIdleCharacter() {
  const character = document.getElementById('seasonCharacter');
  if (!character) return;

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    isIdle = false;  // 停止動物出現
    idleTimer = setTimeout(() => {
      isIdle = true;
      triggerIdleCharacter();  // 開始第一隻
    }, 2000);  // 10 秒 idle
  }

  ['mousemove', 'keydown', 'click'].forEach(event => {
    window.addEventListener(event, resetIdleTimer);
  });

  resetIdleTimer();
}

export function triggerIdleCharacter() {
  if (!isIdle) return;  // ❌ 如果不是 idle，不要出現動物

  const character = document.getElementById('seasonCharacter');
  const theme = sessionStorage.getItem('selectedTheme') || 'default';
  const themeCharacters = {
    spring: ['🐇', '🐿️', '🦆', '🐤', '🐝'],
    summer: ['🦎', '🐢', '🐓', '🦩', '🦀'],
    autumn: ['🦔', '🦃', '🐕‍🦺', '🦉', '🦌'],
    winter: ['🐧', '🐻‍❄️', '🦊', '🦢', '🦦'],
    default: ['🐾']
  };

  const animals = themeCharacters[theme] || themeCharacters['default'];
  const chosenAnimal = animals[Math.floor(Math.random() * animals.length)];
  character.textContent = chosenAnimal;

  // 重新啟動動畫
  character.classList.remove('walking');
  void character.offsetWidth;
  character.classList.add('walking');

  // 監聽動畫結束，觸發下一隻
  character.addEventListener('animationend', onEnd, { once: true });

  function onEnd() {
    if (isIdle) {
      setTimeout(triggerIdleCharacter, 1000);  // 下一隻延遲一點點再出
    }
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
      initUserHandler();
      modal.classList.add('hidden');
    });
  });
}
