// Simple HTML include loader: fetches and injects fragments into elements with data-include
document.addEventListener('DOMContentLoaded', async () => {
  const includeTargets = document.querySelectorAll('[data-include]');
  
  for (const el of includeTargets) {
    const src = el.getAttribute('data-include');
    if (!src) continue;
    try {
      const res = await fetch(src, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      el.innerHTML = html;
      
      // If header was included, initialize header functionality
      if (src.includes('header.html')) {
        // Dynamically load header.js after header is included
        const script = document.createElement('script');
        script.type = 'module';
        script.src = '../js/header.js';
        document.head.appendChild(script);
      }
    } catch (err) {
      console.error('Failed to include', src, err);
      el.innerHTML = '';
    }
  }
});
