import { qsa } from '../modules/dom.js';

const TEXT = {
  emptyTitle: '杩樻病鏈夊鐢熻处鍙?,
  emptySubtitle: '鐐瑰嚮鍙充笂瑙掆€滄坊鍔犲鐢熲€濆垱寤虹涓€涓瓙濂宠处鍙枫€?,
  edit: '缂栬緫',
  remove: '鍒犻櫎'
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
  if (!value) return '鈥?;
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
              <span class="student-login">鐧诲綍鍚嶏細${escapeHtml(student.loginName)}</span>
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
          <th>瀛︾敓</th>
          <th>鍒涘缓鏃堕棿</th>
          <th>鎿嶄綔</th>
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

