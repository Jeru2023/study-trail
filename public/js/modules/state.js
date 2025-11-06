import { loadRememberedLogin } from './remember.js';

const listeners = new Set();

let initialRole = 'parent';
const remembered = loadRememberedLogin();
if (remembered?.remember && remembered?.role) {
  initialRole = remembered.role;
}

const state = {
  role: initialRole
};

export function getRole() {
  return state.role;
}

export function setRole(role) {
  if (role === state.role) return;
  state.role = role;
  listeners.forEach((listener) => listener(role));
}

export function onRoleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetState() {
  state.role = 'parent';
  listeners.clear();
}
