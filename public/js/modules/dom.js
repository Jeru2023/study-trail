export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function toggleHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
}

export function setMessage(element, message, type = '') {
  if (!element) return;
  element.textContent = message ?? '';
  if (type) {
    element.dataset.type = type;
  } else {
    delete element.dataset.type;
  }
}

export function disableForm(form, disabled) {
  if (!form) return;
  qsa('input, button, select, textarea', form).forEach((node) => {
    // eslint-disable-next-line no-param-reassign
    node.disabled = disabled;
  });
}
