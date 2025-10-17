import { qs } from './modules/dom.js';
import { setupIdentitySelector } from './modules/identitySelector.js';
import { setupAuthForms } from './modules/authForms.js';
import { getRole } from './modules/state.js';

document.addEventListener('DOMContentLoaded', () => {
  const shell = qs('.auth-shell');
  const overlay = qs('#identityOverlay');

  setupIdentitySelector({ overlay, shell });

  setupAuthForms({
    loginForm: qs('#loginForm'),
    signupForm: qs('#signupForm'),
    loginMessage: qs('#loginMessage'),
    signupMessage: qs('#signupMessage'),
    ctaPanel: qs('#ctaPanel'),
    signupPanel: qs('#signupPanel'),
    showSignupBtn: qs('#showSignup'),
    closeSignupBtn: qs('#closeSignup'),
    shell,
    parentCta: qs('#parentCta'),
    studentCta: qs('#studentCta')
  });

  // 默认身份为家长，若需要可在此调整
  shell.dataset.role = getRole();
});
