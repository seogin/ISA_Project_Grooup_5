// Simple HTML include loader: fetches and injects fragments into elements with data-include
document.addEventListener('DOMContentLoaded', () => {
  const includeTargets = document.querySelectorAll('[data-include]');
  includeTargets.forEach(async (el) => {
    const src = el.getAttribute('data-include');
    if (!src) return;
    try {
      const res = await fetch(src, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      el.innerHTML = html;
    } catch (err) {
      console.error('Failed to include', src, err);
      el.innerHTML = '';
    }
  });
});
