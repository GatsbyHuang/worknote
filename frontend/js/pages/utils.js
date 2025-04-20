export function bindOnce(el, event, handler) {
  if (!el || el.dataset.bound) return;
  el.addEventListener(event, handler);
  el.dataset.bound = 'true';
}
