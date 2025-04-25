export function bindOnce(el, event, handler) {
  if (!el || el.dataset.bound) return;
  el.addEventListener(event, handler);
  el.dataset.bound = 'true';
}

export function showDownloadSpinner() {
  document.getElementById('downloadSpinner')?.classList.remove('hidden');
}
export function hideDownloadSpinner() {
  document.getElementById('downloadSpinner')?.classList.add('hidden');
}

export function updateHashParam(key, value) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  params.set(key, value);
  const baseHash = location.hash.split('?')[0];
  window.history.replaceState({}, '', `${baseHash}?${params.toString()}`);
}

export function clearSelect(selectElement, placeholder = 'Select...') {
  selectElement.innerHTML = `<option value="">${placeholder}</option>`;
}

export function showToast(actionOrMessage, type = 'info', name = '') {
  const typeColors = {
    info: 'bg-white text-gray-800 border-gray-300',
    success: 'bg-green-100 text-green-800 border-green-300',
    error: 'bg-red-100 text-red-800 border-red-300'
  };

  const typeMap = {
    add: 'success',
    delete: 'error',
    update: 'success',
    info: 'info'
  };

  let message = actionOrMessage;
  let finalType = type;

  // 判斷是否使用 action 格式
  if (actionOrMessage.includes('.')) {
    const { message: formattedMsg, type: mappedType } = formatToast(actionOrMessage, type, name);
    message = formattedMsg;
    finalType = mappedType;  // 可能是 add/delete/update/info
  }

  const colorClass = typeColors[typeMap[finalType] || 'info'];

  // ✅ 建立 toast DOM
  const toast = document.createElement('div');
  toast.className = `fixed top-16 right-4 border px-4 py-2 rounded-xl shadow-md opacity-0 transform translate-y-[-10px] transition-all text-sm ${colorClass}`;
  toast.style.zIndex = 9999;
  toast.innerHTML = `<span class="inline-block align-middle">${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-[-10px]');
    toast.classList.add('opacity-100', 'translate-y-0');
  });

  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'translate-y-[-10px]');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function formatToast(action, type, name) {
  const emojis = {
    add: ['✨', '🆕', '🎉'],
    delete: ['🗑️', '🚮', '❌'],
    update: ['💾', '🔄', '✅'],
    info: ['ℹ️', '🔔']
  };

  const messages = {
    'category.add': [
      `Category "${name}" created successfully!`,
      `New category "${name}" is ready!`
    ],
    'category.delete': [
      `Category "${name}" deleted.`,
      `Removed category "${name}".`
    ],
    'note.add': [
      `Note "${name}" added.`,
      `New note "${name}" created!`
    ],
    'note.delete': [
      `Note "${name}" deleted.`,
      `Removed note "${name}".`
    ],
    'note.update': [
      `Note "${name}" saved.`,
      `Updated note "${name}".`
    ]
  };

  const typeGroup = type || 'info';
  const emojiList = emojis[typeGroup] || ['ℹ️'];
  const messageList = messages[action] || ['Action completed!'];

  const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
  const message = `${emoji} ${messageList[Math.floor(Math.random() * messageList.length)]}`;

  return { message, type: typeGroup };
}
