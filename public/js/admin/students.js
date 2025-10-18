import { qsa } from '../modules/dom.js';

const TEXT = {
  emptyTitle: '\u8FD8\u6CA1\u6709\u5B66\u751F\u8D26\u53F7',
  emptySubtitle: '\u70B9\u51FB\u53F3\u4E0A\u89D2\u201C\u6DFB\u52A0\u5B66\u751F\u201D\u521B\u5EFA\u7B2C\u4E00\u4E2A\u5B50\u5973\u8D26\u53F7\u3002',
  edit: '\u7F16\u8F91',
  remove: '\u5220\u9664'
};

function escapeHtml(value) {
  if (!value) return '';
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function formatDate(value) {
  if (!value) return '\u2014';
  let normalized = value;
  if (typeof value === 'string' && value.includes(' ')) {
    normalized = value.replace(' ', 'T');
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function renderStudentList(container, students, { onEdit, onDelete }) {
  if (!container) return;

  if (!students.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>${TEXT.emptyTitle}</strong>
        <span>${TEXT.emptySubtitle}</span>
      </div>
    `;
    return;
  }

  const rows = students
    .map(
      (student) => `
        <tr>
          <td>
            <div class="student-name">
              <strong>${escapeHtml(student.name || student.loginName)}</strong>
              <span class="student-login">\u767B\u5F55\u540D\uFF1A${escapeHtml(student.loginName)}</span>
            </div>
          </td>
          <td>${escapeHtml(formatDate(student.createdAt))}</td>
          <td>
            <div class="table__actions">
              <button type="button" class="ghost-button" data-action="edit" data-id="${student.id}">${TEXT.edit}</button>
              <button type="button" class="ghost-button" data-action="delete" data-id="${student.id}">${TEXT.remove}</button>
            </div>
          </td>
        </tr>
      `
    )
    .join('');

  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>\u5B66\u751F</th>
          <th>\u521B\u5EFA\u65F6\u95F4</th>
          <th>\u64CD\u4F5C</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  qsa('[data-action="edit"]', container).forEach((btn) => {
    btn.addEventListener('click', () => {
      onEdit(Number(btn.dataset.id));
    });
  });

  qsa('[data-action="delete"]', container).forEach((btn) => {
    btn.addEventListener('click', () => {
      onDelete(Number(btn.dataset.id));
    });
  });
}

export function populateStudentForm(form, student) {
  form.elements.name.value = student?.name ?? '';
  form.elements.loginName.value = student?.loginName ?? '';
  form.elements.password.value = '';
}

export function readStudentForm(form) {
  return {
    name: form.elements.name.value.trim(),
    loginName: form.elements.loginName.value.trim(),
    password: form.elements.password.value
  };
}

export function resetStudentForm(form) {
  form.reset();
}
