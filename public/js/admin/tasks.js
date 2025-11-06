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
  columnType: '\u4efb\u52a1\u7c7b\u578b',
  columnPoints: '\u4efb\u52a1\u79ef\u5206',
  columnPeriod: '\u5468\u671f',
  columnCreated: '\u521b\u5efa\u65f6\u95f4',
  columnActions: '\u64cd\u4f5c',
  overridesEmptyTitle: '\u6682\u65e0\u4e13\u9879\u65e5\u7a0b',
  overridesEmptySubtitle: '\u5982\u679c\u9047\u5230\u8c03\u4f11\u6216\u975e\u5e38\u63aa\u65bd\uff0c\u53ef\u5728\u4e0a\u65b9\u6dfb\u52a0\u65e5\u671f\u8c03\u6574\u3002',
  overridesColumnDate: '\u65e5\u671f\u8303\u56f4',
  overridesColumnType: '\u4efb\u52a1\u7c7b\u578b',
  overridesColumnNote: '\u5907\u6ce8',
  overridesColumnUpdated: '\u6700\u540e\u66f4\u65b0',
  overridesColumnActions: '\u64cd\u4f5c'
};

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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

function formatPoints(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return '0';
  }
  return String(parsed);
}

function formatScheduleType(value, recurringDay = null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'holiday') {
    return '节假任务';
  }
  if (normalized === 'recurring') {
    const index = Number.parseInt(String(recurringDay ?? '').trim(), 10);
    if (Number.isInteger(index) && index >= 0 && index <= 6) {
      return `定期任务（每周${WEEKDAY_LABELS[index]}）`;
    }
    return '定期任务';
  }
  return '日常任务';
}

function setRecurringDay(form, day) {
  if (!form) return;
  const container = form.querySelector('[data-weekday-toggle]');
  if (!container) return;
  const hidden = container.querySelector('input[name="recurringDayOfWeek"]');
  container.querySelectorAll('[data-weekday]').forEach((button) => {
    const value = Number.parseInt(button.dataset.weekday, 10);
    const isActive = Number.isInteger(day) && day === value;
    button.classList.toggle('chip-button--active', isActive);
  });
  if (hidden) {
    if (Number.isInteger(day) && day >= 0 && day <= 6) {
      hidden.value = String(day);
    } else {
      hidden.value = '';
    }
  }
}

function syncRecurringDayField(form) {
  if (!form) return;
  const hidden = form?.elements?.recurringDayOfWeek;
  if (!hidden) {
    setRecurringDay(form, null);
    return;
  }
  const value = Number.parseInt(hidden.value, 10);
  setRecurringDay(form, Number.isInteger(value) ? value : null);
}

function toggleRecurringFields(form, scheduleType) {
  if (!form) return;
  const field = form.querySelector('[data-recurring-fields]');
  if (!field) return;
  const isRecurring = scheduleType === 'recurring';
  field.hidden = !isRecurring;
  field.classList.toggle('is-visible', isRecurring);
  if (!isRecurring) {
    setRecurringDay(form, null);
  } else {
    syncRecurringDayField(form);
  }

  const weekdayContainer = form.querySelector('[data-weekday-toggle]');
  if (weekdayContainer) {
    weekdayContainer.setAttribute('aria-hidden', String(!isRecurring));
  }
}

function setScheduleToggle(form, value) {
  if (!form) return;
  const normalized = value === 'holiday' ? 'holiday' : value === 'recurring' ? 'recurring' : 'weekday';
  const hidden = form.elements.scheduleType;
  if (hidden) {
    hidden.value = normalized;
  }
  const container = form.querySelector('[data-task-type-toggle]');
  if (!container) return;
  container.querySelectorAll('[data-schedule]').forEach((button) => {
    const isActive = button.dataset.schedule === normalized;
    button.classList.toggle('chip-button--active', isActive);
  });
  toggleRecurringFields(form, normalized);
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
          <td>${escapeHtml(
            formatScheduleType(task.schedule_type, task.recurring_day_of_week)
          )}</td>
          <td>${escapeHtml(formatPoints(task.points))}</td>
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
          <th>${TEXT.columnType}</th>
          <th>${TEXT.columnPoints}</th>
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
  if (form.elements.points) {
    form.elements.points.value = '0';
  }
  if (form.elements.description) {
    form.elements.description.value = '';
  }
  setScheduleToggle(form, 'weekday');
  setRecurringDay(form, null);
}

export function populateTaskForm(form, task) {
  form.elements.title.value = task?.title ?? '';
  if (form.elements.description) {
    form.elements.description.value = task?.description ?? '';
  }
  if (form.elements.points) {
    form.elements.points.value =
      task?.points !== undefined && task?.points !== null ? String(task.points) : '0';
  }
  if (form.elements.startDate) {
    form.elements.startDate.value = task?.start_date ?? '';
  }
  if (form.elements.endDate) {
    form.elements.endDate.value = task?.end_date ?? '';
  }
  const scheduleType = task?.schedule_type ?? 'weekday';
  const recurringDay =
    task?.recurring_day_of_week ?? task?.recurringDayOfWeek ?? form.elements.recurringDayOfWeek?.value;
  setScheduleToggle(form, scheduleType);
  if (scheduleType === 'recurring') {
    const dayValue = Number.parseInt(recurringDay, 10);
    setRecurringDay(form, Number.isInteger(dayValue) ? dayValue : null);
  } else {
    setRecurringDay(form, null);
  }
}

export function readTaskForm(form) {
  const title = form.elements.title.value.trim();
  const descriptionField = form.elements.description;
  const description = descriptionField ? descriptionField.value.trim() : '';
  const startDate = form.elements.startDate ? form.elements.startDate.value : '';
  const endDate = form.elements.endDate ? form.elements.endDate.value : '';
  const pointsValue = form.elements.points.value.trim();
  const parsedPoints = Number.parseInt(pointsValue, 10);
  const points = Number.isNaN(parsedPoints) ? null : parsedPoints;
  const scheduleType = form.elements.scheduleType?.value ?? 'weekday';
  const recurringRaw = form.elements.recurringDayOfWeek?.value ?? '';
  const recurringDay = Number.parseInt(recurringRaw, 10);
  const recurringDayOfWeek = Number.isInteger(recurringDay) ? recurringDay : null;

  return {
    title,
    description: description || null,
    points,
    startDate: startDate || null,
    endDate: endDate || null,
    scheduleType,
    recurringDayOfWeek: scheduleType === 'recurring' ? recurringDayOfWeek : null
  };
}

export function setupTaskTypeToggle(form) {
  const container = form?.querySelector('[data-task-type-toggle]');
  if (!container) return;
  if (container.dataset.bound === 'true') {
    const current = form.elements.scheduleType?.value ?? 'weekday';
    setScheduleToggle(form, current);
    if (current === 'recurring') {
      syncRecurringDayField(form);
    }
    return;
  }
  container.dataset.bound = 'true';
  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-schedule]');
    if (!button || button.disabled) return;
    event.preventDefault();
    setScheduleToggle(form, button.dataset.schedule);
  });

  const weekdayContainer = form.querySelector('[data-weekday-toggle]');
  if (weekdayContainer && weekdayContainer.dataset.bound !== 'true') {
    weekdayContainer.dataset.bound = 'true';
    weekdayContainer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-weekday]');
      if (!button || button.disabled) return;
      event.preventDefault();
      const value = Number.parseInt(button.dataset.weekday, 10);
      const isActive = button.classList.contains('chip-button--active');
      if (isActive) {
        setRecurringDay(form, null);
      } else if (Number.isInteger(value)) {
        setRecurringDay(form, value);
      }
    });
  }

  const initial = form.elements.scheduleType?.value ?? 'weekday';
  setScheduleToggle(form, initial);
  if (initial === 'recurring') {
    syncRecurringDayField(form);
  }
}

export function renderTaskOverrides(container, overrides, { onDelete }) {
  if (!container) return;

  if (!Array.isArray(overrides) || overrides.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>${TEXT.overridesEmptyTitle}</strong>
        <span>${TEXT.overridesEmptySubtitle}</span>
      </div>
    `;
    return;
  }

  const rows = overrides
    .map((override) => {
      const startLabel = formatDate(override.startDate);
      const endLabel = formatDate(override.endDate);
      const rangeText = override.startDate === override.endDate
        ? startLabel
        : `${startLabel} 至 ${endLabel}`;
      const rangeLabel = escapeHtml(rangeText);
      const typeCell = escapeHtml(formatScheduleType(override.scheduleType));
      const noteCell = escapeHtml(override.note || TEXT.dash);
      const updatedCell = escapeHtml(formatDate(override.updatedAt));
      return `
        <tr>
          <td>${rangeLabel}</td>
          <td>${typeCell}</td>
          <td>${noteCell}</td>
          <td>${updatedCell}</td>
          <td>
            <div class="table__actions">
              <button type="button" class="ghost-button" data-action="delete-override" data-id="${override.id}" data-label="${escapeHtml(rangeText)}">删除</button>
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
          <th>${TEXT.overridesColumnDate}</th>
          <th>${TEXT.overridesColumnType}</th>
          <th>${TEXT.overridesColumnNote}</th>
          <th>${TEXT.overridesColumnUpdated}</th>
          <th>${TEXT.overridesColumnActions}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  qsa('[data-action="delete-override"]', container).forEach((btn) => {
    btn.addEventListener('click', () => {
      const overrideId = Number.parseInt(btn.dataset.id, 10);
      if (!Number.isInteger(overrideId) || overrideId <= 0 || !onDelete) return;
      onDelete(overrideId, btn.dataset.label || '');
    });
  });
}
