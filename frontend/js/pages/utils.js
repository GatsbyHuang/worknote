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
  // 🌸 根據季節主題，決定 page 顏色
  function getPageThemeClass() {
    const pageThemes = {
      spring: 'bg-pink-100 text-pink-800 border-pink-300',
      summer: 'bg-sky-100 text-sky-800 border-sky-300',
      autumn: 'bg-orange-100 text-orange-800 border-orange-300',
      winter: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    const selectedTheme = localStorage.getItem('selectedTheme');
    console.log("localStorage:",selectedTheme)
    return pageThemes[selectedTheme] || 'bg-white text-gray-800 border-gray-300';  // 🟢 預設白色
  }

	const typeColors = {
	  info: getPageThemeClass(),
	  success: getPageThemeClass(),
	  error: getPageThemeClass(),
	  page: getPageThemeClass()
	};


  const typeMap = {
    add: 'success',
    delete: 'error',
    update: 'success',
    info: 'info'
  };

  let message = actionOrMessage;
  let finalType = type;

  // 判斷是否是 action 格式
  if (actionOrMessage.includes('.')) {
    const { message: formattedMsg, type: mappedType } = formatToast(actionOrMessage, type, name);
    message = formattedMsg;
    finalType = mappedType;  // 可能是 add/delete/update/page
  }

  const colorClass = typeColors[finalType] || typeColors['info'];

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
    info: ['ℹ️', '🔔'],
    page_dashboard: ['📊', '📈', '🧭', '🎯', '🚀'],
    page_history: ['📜', '📝', '📚', '📂', '🗂️'],
    page_notetree: ['🌳', '🗂️', '📝', '📄', '✏️'],
    page_export: ['📦', '💾', '📤', '📑'],
    page_import: ['📥', '📂', '🔄', '🛠️']
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
	'note.autosaved': [
	  `Changes to "${name}" saved.`,
	  `"${name}" has been saved automatically.`,
	  `Auto-saved your work on "${name}".`
	],
    'note.delete': [
      `Note ${name} deleted.`,
      `Removed note ${name}.`
    ],
    'note.update': [
      `Note "${name}" saved.`,
      `Updated note "${name}".`
    ],
	'nb.export': [
      `Notebook "${name}" saved.`,
      `Export Notebook "${name}".`
    ],
	'nb.import': [
      `${name} imported.`,
      `Imported ${name}.`
    ],
    'page.dashboard': [
      'Dashboard ready to explore!',
      'All systems go on the dashboard!'
    ],
    'page.history': [
      'History page loaded!',
      'Explore your notes history!'
    ],
    'page.notetree': [
      'Notebook loaded!',
      'Navigate your notebook!'
    ],
    'page.export': [
      'Export page ready!',
      'Prepare your data for export!'
    ],
    'page.import': [
      'Import page ready!',
      'Let’s bring in some data!'
    ]
  };

  const isPageAction = action.startsWith('page.');
  const typeGroup = isPageAction ? `page_${action.split('.')[1]}` : (type || 'info');
  const emojiList = emojis[typeGroup] || ['ℹ️'];
  const messageList = messages[action] || ['Action completed!'];

  const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
  const message = `${emoji} ${messageList[Math.floor(Math.random() * messageList.length)]}`;

  return { message, type: isPageAction ? 'page' : typeGroup };
}
