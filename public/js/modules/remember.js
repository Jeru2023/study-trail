const STORAGE_KEY = 'studyTrail.remember';

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.password) {
      try {
        parsed.password = decodeURIComponent(atob(parsed.password));
      } catch (_error) {
        parsed.password = '';
      }
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

function setStorage(value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  if (!value) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const payload = {
    role: value.role || 'parent',
    loginName: value.loginName || '',
    password: value.password ? btoa(encodeURIComponent(value.password)) : '',
    remember: Boolean(value.remember)
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadRememberedLogin() {
  return getStorage();
}

export function saveRememberedLogin({ role, loginName, password }) {
  setStorage({
    role,
    loginName,
    password,
    remember: true
  });
}

export function clearRememberedLogin() {
  setStorage(null);
}

export function hasRememberedLogin() {
  const stored = getStorage();
  return Boolean(stored && stored.remember && stored.loginName && stored.password);
}
