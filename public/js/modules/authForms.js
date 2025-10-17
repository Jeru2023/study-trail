import { createStudent, fetchStudents, login, registerParent } from './apiClient.js';
import { setRole, getRole, onRoleChange } from './state.js';
import { disableForm, qsa, setMessage, toggleHidden } from './dom.js';

function updateShellRole(shell, role) {
  if (!shell) return;
  shell.dataset.role = role;
  document.title = role === 'parent' ? '学迹 · 家长登录' : '学迹 · 学生登录';
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
    setMessage(loginMessage, '请填写完整信息', 'error');
    return;
  }

  try {
    disableForm(loginForm, true);
    setMessage(loginMessage, '正在登录...', 'info');
    const { user } = await login(payload);
    setMessage(loginMessage, `欢迎回来，${user.loginName}！`, 'success');
    loginForm.reset();
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
    setMessage(signupMessage, '请填写完整信息', 'error');
    return;
  }

  try {
    disableForm(signupForm, true);
    setMessage(signupMessage, '正在创建账号...', 'info');
    await registerParent(payload);
    setRole('parent');
    setMessage(signupMessage, '注册成功，请使用新账号登录。', 'success');
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
  signupMessage
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
    toggleHidden(ctaPanel, true);
    toggleHidden(signupPanel, true);
  } else {
    toggleHidden(ctaPanel, false);
  }
}

function setupSignupToggle({ showSignupBtn, closeSignupBtn, signupPanel, ctaPanel }) {
  if (showSignupBtn) {
    showSignupBtn.addEventListener('click', () => {
      toggleHidden(signupPanel, false);
      toggleHidden(ctaPanel, true);
    });
  }

  if (closeSignupBtn) {
    closeSignupBtn.addEventListener('click', () => {
      toggleHidden(signupPanel, true);
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
  shell
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
      signupMessage
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
    signupMessage
  });
}
