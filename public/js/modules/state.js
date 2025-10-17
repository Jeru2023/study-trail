const listeners = new Set();

const state = {
  role: 'parent'
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
