import { login, registerParent } from './apiClient.js';
import { setRole, getRole, onRoleChange } from './state.js';
import { disableForm, qsa, setMessage, toggleHidden } from './dom.js';

const TEXT = {
  studentTitle: '学迹 · 学生登录',
  parentTitle: '学迹 · 家长登录',
  fillRequired: '请填写完整信息',
  loggingIn: '正在登录...',
  loginWelcome: (name) => `欢迎回来，${name}！`,
  creatingAccount: '正在创建账号...',
  signupSuccess: '注册成功，请使用新账号登录。',
  parentOnly: '家长身份可注册，学生请联系家长创建账号。'
};

function updateShellRole(shell, role) {
  if (!shell) return;
  shell.dataset.role = role;
  document.title = role === 'parent' ? TEXT.parentTitle : TEXT.studentTitle;
}

async function handleLogin(event, loginForm, loginMessage) {
  event.preventDefault();
  const role = getRole();
  const formData = new FormData(loginForm);

  const payload = {
    role,
    loginName: formData.get('loginName')?.trim(),
    password: formData.get('password')
  };

  if (!payload.loginName || !payload.password) {
    setMessage(loginMessage, TEXT.fillRequired, 'error');
    return;
  }

  try {
    disableForm(loginForm, true);
    setMessage(loginMessage, TEXT.loggingIn, 'info');
    const { user } = await login(payload);

    if (user.role === 'parent') {
      window.location.href = '/admin.html';
      return;
    }

    window.location.href = '/student.html';
  } catch (error) {
    setMessage(loginMessage, error.message, 'error');
  } finally {
    disableForm(loginForm, false);
  }
}

async function handleSignup(event, signupForm, signupMessage) {
  event.preventDefault();
  const formData = new FormData(signupForm);

  const payload = {
    loginName: formData.get('loginName')?.trim(),
    email: formData.get('email')?.trim(),
    password: formData.get('password')
  };

  if (!payload.loginName || !payload.email || !payload.password) {
    setMessage(signupMessage, TEXT.fillRequired, 'error');
    return;
  }

  try {
    disableForm(signupForm, true);
    setMessage(signupMessage, TEXT.creatingAccount, 'info');
    await registerParent(payload);
    setRole('parent');
    setMessage(signupMessage, TEXT.signupSuccess, 'success');
    signupForm.reset();
  } catch (error) {
    setMessage(signupMessage, error.message, 'error');
  } finally {
    disableForm(signupForm, false);
  }
}

function updateUIForRole({
  role,
  ctaPanel,
  signupPanel,
  loginForm,
  signupForm,
  loginMessage,
  signupMessage,
  parentCta,
  studentCta
}) {
  updateShellRole(document.querySelector('.auth-shell'), role);
  qsa('input', loginForm).forEach((input) => {
    input.value = '';
  });
  setMessage(loginMessage, '', '');

  if (signupForm) {
    qsa('input', signupForm).forEach((input) => {
      input.value = '';
    });
    setMessage(signupMessage, '', '');
  }

  if (role === 'student') {
    toggleHidden(ctaPanel, false);
    toggleHidden(parentCta, true);
    toggleHidden(studentCta, false);
    toggleHidden(signupPanel, true);
    setMessage(loginMessage, TEXT.parentOnly, 'info');
  } else {
    toggleHidden(ctaPanel, false);
    toggleHidden(parentCta, false);
    toggleHidden(studentCta, true);
    toggleHidden(signupPanel, signupPanel?.dataset?.mode !== 'open');
  }
}

function setupSignupToggle({ showSignupBtn, closeSignupBtn, signupPanel, ctaPanel }) {
  if (showSignupBtn) {
    showSignupBtn.addEventListener('click', () => {
      if (signupPanel) {
        signupPanel.hidden = false;
        signupPanel.dataset.mode = 'open';
      }
      toggleHidden(ctaPanel, true);
    });
  }

  if (closeSignupBtn) {
    closeSignupBtn.addEventListener('click', () => {
      if (signupPanel) {
        signupPanel.hidden = true;
        signupPanel.dataset.mode = 'closed';
      }
      toggleHidden(ctaPanel, false);
    });
  }
}

export function setupAuthForms({
  loginForm,
  signupForm,
  loginMessage,
  signupMessage,
  ctaPanel,
  signupPanel,
  showSignupBtn,
  closeSignupBtn,
  shell,
  parentCta,
  studentCta
}) {
  if (loginForm) {
    loginForm.addEventListener('submit', (event) => handleLogin(event, loginForm, loginMessage));
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (event) => handleSignup(event, signupForm, signupMessage));
  }

  setupSignupToggle({ showSignupBtn, closeSignupBtn, signupPanel, ctaPanel });

  onRoleChange((role) => {
    updateShellRole(shell, role);
    updateUIForRole({
      role,
      ctaPanel,
      signupPanel,
      loginForm,
      signupForm,
      loginMessage,
      signupMessage,
      parentCta,
      studentCta
    });
  });

  const initialRole = getRole();
  updateShellRole(shell, initialRole);
  updateUIForRole({
    role: initialRole,
    ctaPanel,
    signupPanel,
    loginForm,
    signupForm,
    loginMessage,
    signupMessage,
    parentCta,
    studentCta
  });
}
