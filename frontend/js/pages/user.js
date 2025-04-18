// ===== user.js =====
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

export function initUserHandler(){
	document.getElementById('userAvatar')?.addEventListener('click', openLoginModal);
	document.getElementById('loginCancel')?.addEventListener('click', closeLoginModal);
	document.getElementById('loginConfirm')?.addEventListener('click', () => {
	const val = document.getElementById('userIdInput').value.trim();
	if (val) localStorage.setItem('userId', val);
	else localStorage.removeItem('userId');
	closeLoginModal();
	updateUserUI();
  });
	
}

