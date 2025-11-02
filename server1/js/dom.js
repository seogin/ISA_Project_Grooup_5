// Small DOM helpers used by page scripts

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function on(el, event, handler, options) {
  el.addEventListener(event, handler, options);
  return () => el.removeEventListener(event, handler, options);
}

export function onSubmit(form, handler) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handler(e);
  });
}

export function setDisabled(el, isDisabled) {
  if (!el) return;
  el.disabled = !!isDisabled;
}

export function show(el) {
  if (!el) return;
  el.classList.remove('hidden');
}

export function hide(el) {
  if (!el) return;
  el.classList.add('hidden');
}
