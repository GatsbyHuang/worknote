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