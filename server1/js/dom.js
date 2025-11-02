// Small DOM helpers used by page scripts

export function on(element, event, handler, options) {
  element.addEventListener(event, handler, options);
  return () => element.removeEventListener(event, handler, options);
}

export function onSubmit(form, handler) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handler(e);
  });
}

export function setDisabled(element, isDisabled) {
  if (!element) return;
  element.disabled = !!isDisabled;
}

export function show(element) {
  if (!element) return;
  element.classList.remove('hidden');
}

export function hide(element) {
  if (!element) return;
  element.classList.add('hidden');
}
