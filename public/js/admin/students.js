import { qsa } from '../modules/dom.js';

const TEXT = {
  emptyTitle: '还没有学生账号',
  emptySubtitle: '点击右上角“添加学生”创建第一个子女账号。',
  edit: '编辑',
  remove: '删除'
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
  if (!value) return '—';
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
              <span class="student-login">登录名：${escapeHtml(student.loginName)}</span>
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
          <th>学生</th>
          <th>创建时间</th>
          <th>操作</th>
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
