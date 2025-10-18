import { qsa } from '../modules/dom.js';

const TEXT = {
  emptyTitle: '\u8fd8\u6ca1\u6709\u4efb\u52a1',
  emptySubtitle: '\u70b9\u51fb\u53f3\u4e0a\u89d2\u201c\u65b0\u5efa\u4efb\u52a1\u201d\u5f00\u59cb\u6dfb\u52a0\u7b2c\u4e00\u6761\u6253\u5361\u5b89\u6392\u3002',
  periodUnlimited: '\u4e0d\u9650\u5468\u671f',
  periodFrom: (start) => `${start} \u8d77`,
  periodTo: (end) => `\u622a\u81f3 ${end}`,
  periodRange: (start, end) => `${start} \u81f3 ${end}`,
  dash: '\u2014',
  edit: '\u7f16\u8f91',
  remove: '\u5220\u9664',
  columnTask: '\u4efb\u52a1',
  columnPeriod: '\u5468\u671f',
  columnCreated: '\u521b\u5efa\u65f6\u95f4',
  columnActions: '\u64cd\u4f5c'
};

function escapeHtml(value) {
  if (!value) return '';
  return value.replace(/[&<>'\"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function formatDate(value) {
  if (!value) return TEXT.dash;
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

function formatPeriod(task) {
  const start = task.start_date;
  const end = task.end_date;
  if (!start && !end) {
    return TEXT.periodUnlimited;
  }
  if (start && end) {
    return TEXT.periodRange(start, end);
  }
  if (start) {
    return TEXT.periodFrom(start);
  }
  return TEXT.periodTo(end);
}

export function renderTaskList(container, tasks, { onEdit, onDelete }) {
  if (!container) return;

  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>${TEXT.emptyTitle}</strong>
        <span>${TEXT.emptySubtitle}</span>
      </div>
    `;
    return;
  }

  const rows = tasks
    .map((task) => {
      const safeTitle = escapeHtml(task.title);
      const safeDescription = escapeHtml(task.description);
      return `
        <tr>
          <td>
            <div class="task-title">
              <strong>${safeTitle}</strong>
              ${safeDescription ? `<p class="task-desc">${safeDescription}</p>` : ''}
            </div>
          </td>
          <td>${escapeHtml(formatPeriod(task))}</td>
          <td>${escapeHtml(formatDate(task.created_at))}</td>
          <td>
            <div class="table__actions">
              <button type="button" class="ghost-button" data-action="edit" data-task="${task.id}">${TEXT.edit}</button>
              <button type="button" class="ghost-button" data-action="delete" data-task="${task.id}">${TEXT.remove}</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>${TEXT.columnTask}</th>
          <th>${TEXT.columnPeriod}</th>
          <th>${TEXT.columnCreated}</th>
          <th>${TEXT.columnActions}</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  qsa('[data-action="edit"]', container).forEach((btn) => {
    btn.addEventListener('click', () => {
      onEdit(Number(btn.dataset.task));
    });
  });

  qsa('[data-action="delete"]', container).forEach((btn) => {
    btn.addEventListener('click', () => {
      onDelete(Number(btn.dataset.task));
    });
  });
}

export function resetTaskForm(form) {
  form.reset();
}

export function populateTaskForm(form, task) {
  form.elements.title.value = task?.title ?? '';
  form.elements.description.value = task?.description ?? '';
  form.elements.startDate.value = task?.start_date ?? '';
  form.elements.endDate.value = task?.end_date ?? '';
}

export function readTaskForm(form) {
  const title = form.elements.title.value.trim();
  const description = form.elements.description.value.trim();
  const startDate = form.elements.startDate.value;
  const endDate = form.elements.endDate.value;

  return {
    title,
    description: description || null,
    startDate: startDate || null,
    endDate: endDate || null
  };
}
