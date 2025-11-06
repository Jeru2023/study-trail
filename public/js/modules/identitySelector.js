import { setRole, getRole } from './state.js';
import { hasRememberedLogin, loadRememberedLogin } from './remember.js';

let overlayRef = null;
let shellRef = null;

function hideOverlay() {
  if (!overlayRef) return;
  overlayRef.dataset.open = 'false';
  overlayRef.setAttribute('aria-hidden', 'true');
  overlayRef.classList.add('is-hidden');
  overlayRef.hidden = true;
}

function showOverlay() {
  if (!overlayRef) return;
  overlayRef.hidden = false;
  overlayRef.classList.remove('is-hidden');
  overlayRef.dataset.open = 'true';
  overlayRef.removeAttribute('aria-hidden');
  overlayRef.focus();
}

export function setupIdentitySelector({ overlay, shell }) {
  if (!overlay || !shell) return;
  overlayRef = overlay;
  shellRef = shell;

  const remembered = loadRememberedLogin();
  if (hasRememberedLogin() && remembered?.role) {
    setRole(remembered.role);
    shell.dataset.role = remembered.role;
    hideOverlay();
  } else {
    shell.dataset.role = getRole();
  }

  overlay.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-role]');
    if (!trigger) return;
    const role = trigger.dataset.role;
    setRole(role);
    if (shellRef) {
      shellRef.dataset.role = role;
    }
    hideOverlay();
  });

  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const trigger = event.target.closest('[data-role]');
      if (!trigger) return;
      event.preventDefault();
      const role = trigger.dataset.role;
      setRole(role);
      if (shellRef) {
        shellRef.dataset.role = role;
      }
      hideOverlay();
    }
  });
}

export function requestIdentitySelection() {
  if (!overlayRef) return;
  showOverlay();
}
