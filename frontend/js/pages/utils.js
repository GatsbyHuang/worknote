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
