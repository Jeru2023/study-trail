import { setRole } from './state.js';

export function setupIdentitySelector({ overlay, shell }) {
  if (!overlay || !shell) return;

  // eslint-disable-next-line no-console
  console.log('[identitySelector] initialized', { overlay, shell });

  const hideOverlay = () => {
    overlay.dataset.open = 'false';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.add('is-hidden');
    overlay.hidden = true;
    // Delay removal to avoid interfering with current click handling
    window.requestAnimationFrame(() => {
      overlay.remove();
    });
  };

  overlay.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-role]');
    if (!trigger) return;

    const role = trigger.dataset.role;
    // eslint-disable-next-line no-console
    console.log('[identitySelector] role selected', role);
    setRole(role);
    shell.dataset.role = role;
    hideOverlay();
  });

  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const trigger = event.target.closest('[data-role]');
      if (!trigger) return;
      event.preventDefault();
      const role = trigger.dataset.role;
      // eslint-disable-next-line no-console
      console.log('[identitySelector] role selected via keyboard', role);
      setRole(role);
      shell.dataset.role = role;
      hideOverlay();
    }
  });
}
