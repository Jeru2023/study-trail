const TEXT = {
  emptyTitle: '\u8fd8\u6ca1\u6709\u4efb\u52a1\u5173\u8054',
  emptySubtitle: '\u70b9\u51fb\u201c\u6dfb\u52a0\u5173\u8054\u201d\u9009\u62e9\u5b66\u751f\u5e76\u5206\u914d\u4efb\u52a1\u3002',
  dash: '\u2014',
  edit: '\u7f16\u8f91',
  remove: '\u5220\u9664',
  columnStudent: '\u5b66\u751f',
  columnTasks: '\u5173\u8054\u4efb\u52a1',
  columnCount: '\u4efb\u52a1\u6570\u91cf',
  columnActions: '\u64cd\u4f5c'
};

function escapeHtml(value) {
  if (!value) return '';
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

export function renderAssignmentList(container, assignments, { onEdit, onDelete }) {
  if (!container) return;

  if (!assignments.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>${TEXT.emptyTitle}</strong>
        <span>${TEXT.emptySubtitle}</span>
      </div>
    `;
    return;
  }

  const rows = assignments
    .map((entry) => {
      const studentName = escapeHtml(entry.student.name || entry.student.loginName || TEXT.dash);
      const taskTitles = entry.tasks.map((task) => escapeHtml(task.title)).join('\uff0c');
      return `
        <tr>
          <td>${studentName}</td>
          <td>${taskTitles || TEXT.dash}</td>
          <td>${entry.tasks.length}</td>
          <td>
            <div class="table__actions">
              <button type="button" class="ghost-button" data-action="edit-assignment" data-student="${entry.student.id}">
                ${TEXT.edit}
              </button>
              <button type="button" class="ghost-button" data-action="delete-assignment" data-student="${entry.student.id}">
                ${TEXT.remove}
              </button>
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
          <th>${TEXT.columnStudent}</th>
          <th>${TEXT.columnTasks}</th>
          <th>${TEXT.columnCount}</th>
          <th>${TEXT.columnActions}</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  container.querySelectorAll('[data-action="edit-assignment"]').forEach((button) => {
    button.addEventListener('click', () => {
      onEdit(Number.parseInt(button.dataset.student, 10));
    });
  });

  container.querySelectorAll('[data-action="delete-assignment"]').forEach((button) => {
    button.addEventListener('click', () => {
      onDelete(Number.parseInt(button.dataset.student, 10));
    });
  });
}

export function setStudentOptions(select, students) {
  if (!select) return;
  const options = ['<option value="">\u8bf7\u9009\u62e9\u5b66\u751f</option>'].concat(
    students.map(
      (student) =>
        `<option value="${student.id}">${escapeHtml(student.name || student.loginName)}</option>`
    )
  );
  select.innerHTML = options.join('');
}

export function renderTaskCheckboxes(container, tasks) {
  if (!container) return;
  if (!tasks.length) {
    container.innerHTML = '<p class="form-hint">\u8fd8\u6ca1\u6709\u4efb\u52a1\u53ef\u7528\uff0c\u8bf7\u5148\u65b0\u5efa\u4efb\u52a1\u3002</p>';
    return;
  }
  const items = tasks
    .map(
      (task) => `
        <label class="checkbox-item">
          <input type="checkbox" name="taskIds" value="${task.id}" />
          <span>${escapeHtml(task.title)}</span>
        </label>
      `
    )
    .join('');
  container.innerHTML = `<div class="checkbox-group">${items}</div>`;
}

export function markTaskSelections(container, selectedTaskIds) {
  if (!container) return;
  const ids = new Set(selectedTaskIds.map((id) => Number.parseInt(id, 10)));
  container.querySelectorAll('input[type="checkbox"][name="taskIds"]').forEach((input) => {
    const value = Number.parseInt(input.value, 10);
    input.checked = ids.has(value);
  });
}

export function resetAssignmentForm(form) {
  if (!form) return;
  form.reset();
  const taskContainer = form.querySelector('[data-assignment-tasks]');
  if (taskContainer) {
    markTaskSelections(taskContainer, []);
  }
}

export function populateAssignmentForm(form, assignment) {
  if (!form || !assignment) return;
  if (form.elements.studentId) {
    form.elements.studentId.value = assignment.student?.id ?? '';
  }
  const taskContainer = form.querySelector('[data-assignment-tasks]');
  if (taskContainer) {
    markTaskSelections(taskContainer, assignment.taskIds ?? []);
  }
}

export function readAssignmentForm(form) {
  const studentId = Number.parseInt(form.elements.studentId.value, 10);
  const taskIds = Array.from(
    form.querySelectorAll('input[type="checkbox"][name="taskIds"]:checked')
  ).map((input) => Number.parseInt(input.value, 10));

  return {
    studentId,
    taskIds
  };
}
