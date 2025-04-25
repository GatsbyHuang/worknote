// ===== user.js =====
import { getTheme } from './theme.js';  // ⬅️ 引入主題
import { bindOnce } from './utils.js';

export function getUserId() {
  return localStorage.getItem('userId') || '';
}

export function getAvatarId() {
  return localStorage.getItem('userAvatarId') || '1';
}

export function updateUserUI() {
  const userId = getUserId();
  const avatar = document.getElementById('userAvatar');
  const label = document.getElementById('userIdLabel');

  if (userId) {
    avatar.src = `https://i.pravatar.cc/36?u=${getAvatarId()}`;
    label.textContent = userId;
    label.classList.remove('hidden');
  } else {
    avatar.src = "https://www.svgrepo.com/show/452030/avatar-default.svg";
    label.textContent = '';
    label.classList.add('hidden');
  }
}

export function generateAvatars() {
  const picker = document.getElementById('avatarPicker');
  picker.innerHTML = '';
  const current = getAvatarId();

  for (let i = 1; i <= 50; i++) {
    const img = document.createElement('img');
    img.src = `https://i.pravatar.cc/36?u=${i}`;
    img.className = 'w-8 h-8 rounded-full cursor-pointer border border-transparent hover:ring-2 hover:ring-blue-400';
    img.dataset.avatarId = i;

    if (String(i) === current) {
      img.classList.add('ring-2', 'ring-blue-500');
    }

    img.addEventListener('click', () => {
      localStorage.setItem('userAvatarId', i);
      generateAvatars();
    });

    picker.appendChild(img);
  }
}

export function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
  document.getElementById('userIdInput').value = getUserId();
  generateAvatars();
  document.getElementById('userIdInput').focus();
}

export function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}


export function initUserHandler() {
  bindOnce(document.getElementById('userAvatar'), 'click', openLoginModal);
  bindOnce(document.getElementById('loginCancel'), 'click', closeLoginModal);
  bindOnce(document.getElementById('loginConfirm'), 'click', () => {
    const val = document.getElementById('userIdInput').value.trim();
    if (val) localStorage.setItem('userId', val);
    else localStorage.removeItem('userId');
    closeLoginModal();
    updateUserUI();
  });

  // 🔔 歡迎回來提示（每次刷新或路由切換都顯示）
  const userId = getUserId();
  if (userId) {
    showLoginNotice();
  }
}

export function showLoginNotice() {
  const userId = getUserId();
  if (!userId) return;

  const greetings = [
    `Welcome back, ${userId}! 🎉`,
    `Good to see you again, ${userId}! 👋`,
    `Hello, ${userId}! Ready to get things done? 💪`,
    `Nice to have you here, ${userId}! 🌟`,
    `What's on your mind today, ${userId}? 🤔`,
    `Let's make some progress, ${userId}! 🚀`,
    `Hey ${userId}, your notes missed you! 📒`,
    `Back for more, ${userId}? Let's go! 🔥`,
    `Hope you're having a great day, ${userId}! ☀️`,
    `Welcome aboard, ${userId}! 🛳️`
  ];

  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

  const notice = document.createElement('div');
  notice.textContent = randomGreeting;
  notice.className = 'z-[1000] fixed top-5 right-4 text-white px-4 py-2 rounded shadow-lg transform translate-x-full opacity-0 transition-all duration-500';

  // 動態加背景色
  const theme = getTheme();
  switch (theme) {
    case 'spring':
      notice.classList.add('bg-pink-500');
      break;
    case 'summer':
      notice.classList.add('bg-sky-500');
      break;
    case 'autumn':
      notice.classList.add('bg-orange-500');
      break;
    case 'winter':
      notice.classList.add('bg-blue-500');
      break;
    default:
      notice.classList.add('bg-gray-700');
  }

  document.body.appendChild(notice);

  // 動畫進場
  setTimeout(() => {
    notice.classList.remove('translate-x-full', 'opacity-0');
  }, 100);

  // 4秒後滑走
  setTimeout(() => {
    notice.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => notice.remove(), 500);
  }, 4000);
}
