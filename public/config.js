// GitHub Pages frontend configuration.
window.SELAB_API_BASE = 'https://social-engineer-lab-api.mr-adam-clement.workers.dev';

// Load the v3 interface styles.
(() => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./v3.css', document.currentScript.src).href;
  document.head.appendChild(link);
})();

// Small classroom UX fixes layered on top of app.js.
window.addEventListener('DOMContentLoaded', () => {
  const standardHelp = 'Spot something suspicious? Say it in your chat response and explain what looks wrong. Each distinct warning sign you identify is counted here. You still need to take the correct safe action to stop the attack.';
  const guidedHelp = 'Use this as a checklist. When you notice one of these warning signs, mention it in your reply to the attacker. It will turn green when the simulator recognises it. You still need to take the correct safe action to stop the attack.';

  const enhanceWarningHelp = () => {
    document.querySelectorAll('.flags-block').forEach(block => {
      const heading = block.querySelector('h3')?.textContent || '';
      if (!heading.startsWith('Warning signs')) return;

      const existingMuted = block.querySelector('.muted:not(.warning-help)');
      if (existingMuted && existingMuted.textContent !== standardHelp) {
        existingMuted.textContent = standardHelp;
      }

      if (!existingMuted && !block.querySelector('.warning-help')) {
        const help = document.createElement('p');
        help.className = 'muted warning-help';
        help.textContent = guidedHelp;
        const list = block.querySelector('ul.flags');
        if (list) block.insertBefore(help, list);
        else block.appendChild(help);
      }
    });
  };

  // app.js intentionally locks the composer when a mission reaches an outcome.
  // A fresh mission must always start with a usable composer; previously the
  // disabled state survived into the next scenario.
  const unlockComposerForFreshMission = () => {
    const message = document.querySelector('#message');
    const send = document.querySelector('#sendBtn');
    if (message) {
      message.disabled = false;
      message.value = '';
    }
    if (send) send.disabled = false;
  };

  document.querySelector('#startBtn')?.addEventListener('click', () => {
    setTimeout(unlockComposerForFreshMission, 0);
  });
  document.querySelector('#newScenario')?.addEventListener('click', unlockComposerForFreshMission);
  document.querySelector('#backBtn')?.addEventListener('click', unlockComposerForFreshMission);

  enhanceWarningHelp();
  new MutationObserver(enhanceWarningHelp).observe(document.body, { childList: true, subtree: true });
});
