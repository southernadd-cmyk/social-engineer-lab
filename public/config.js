// GitHub Pages frontend configuration.
window.SELAB_API_BASE = 'https://social-engineer-lab-api.mr-adam-clement.workers.dev';
(() => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./v3.css', document.currentScript.src).href;
  document.head.appendChild(link);
})();
