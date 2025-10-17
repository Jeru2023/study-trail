import { setRole } from './state.js';

export function setupIdentitySelector({ overlay, shell }) {
  if (!overlay || !shell) return;

  overlay.addEventListener('click', (event) => {
    if (event.target.matches('[data-role]')) {
      const role = event.target.dataset.role;
      setRole(role);
      shell.dataset.role = role;
      overlay.dataset.open = 'false';
    }
  });
}
