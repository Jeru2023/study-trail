const TEXT = {
  status: {
    draft: '草稿',
    submitted: '待审批',
    approved: '已通过',
    rejected: '已驳回'
  },
  approve: '通过',
  reject: '驳回'
};

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&#39;';
      default:
        return char;
    }
  });
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long'
  });
}

function renderItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return '<li class="plan-approval-card__group plan-approval-card__group--empty">暂无子任务</li>';
  }

  const groups = new Map();
  items.forEach((item) => {
    const key = item.task?.title || item.taskTitle || '关联任务';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  });

  return Array.from(groups.entries())
    .map(([taskTitle, subtasks]) => {
      const list = subtasks
        .map(
          (subtask, index) => `
            <li class="plan-approval-card__subtask">
              <span class="plan-approval-card__subtask-index">${index + 1}</span>
              <span class="plan-approval-card__subtask-title">${escapeHtml(subtask.title || '')}</span>
            </li>
          `
        )
        .join('');
      return `
        <li class="plan-approval-card__group">
          <header class="plan-approval-card__group-header">
            <span class="plan-approval-card__group-title">${escapeHtml(taskTitle)}</span>
            <span class="plan-approval-card__group-count">${subtasks.length}</span>
          </header>
          <ul class="plan-approval-card__subtasks">
            ${list}
          </ul>
        </li>
      `;
    })
    .join('');
}

function renderPlan(plan, { onApprove, onReject }) {
  const status = plan.status || 'draft';
  const statusLabel = TEXT.status[status] ?? status;
  const approveDisabled = status !== 'submitted' ? 'disabled' : '';
  const rejectDisabled = status !== 'submitted' ? 'disabled' : '';
  const rejectionSection = plan.rejectionReason
    ? `<p class="plan-approval-card__rejection">家长驳回理由：${escapeHtml(plan.rejectionReason)}</p>`
    : '';

  return `
    <article class="plan-approval-card" data-plan-id="${plan.id}">
      <header class="plan-approval-card__header">
        <div>
          <h3 class="plan-approval-card__title">${escapeHtml(plan.studentName || '学生')}</h3>
          <p class="plan-approval-card__subtitle">计划日期：${escapeHtml(formatDate(plan.planDate))}</p>
        </div>
        <span class="plan-approval-card__badge plan-approval-card__badge--${escapeHtml(
          status
        )}">${escapeHtml(statusLabel)}</span>
      </header>
      <section class="plan-approval-card__body">
        <h4>今日子任务</h4>
        <ul class="plan-approval-card__items">
          ${renderItems(plan.items)}
        </ul>
        ${rejectionSection}
      </section>
      <footer class="plan-approval-card__actions">
        <button type="button" class="ghost-button" data-action="reject" ${rejectDisabled}>${
          TEXT.reject
        }</button>
        <button type="button" class="primary-button" data-action="approve" ${approveDisabled}>${
          TEXT.approve
        }</button>
      </footer>
    </article>
  `;
}

export function renderPlanApprovalList(container, plans, options = {}) {
  if (!container) return;
  const { onApprove, onReject, emptyState } = options;

  if (!Array.isArray(plans) || plans.length === 0) {
    const emptyTitle = escapeHtml(emptyState?.title || '暂无学习计划');
    const emptySubtitle = escapeHtml(emptyState?.subtitle || '孩子们还未提交新的计划。');
    container.innerHTML = `
      <div class="empty-state">
        <strong>${emptyTitle}</strong>
        <span>${emptySubtitle}</span>
      </div>
    `;
    return;
  }

  container.innerHTML = plans.map((plan) => renderPlan(plan, { onApprove, onReject })).join('');

  container.querySelectorAll('[data-action="approve"]').forEach((button) => {
    button.addEventListener('click', () => {
      const planId = Number.parseInt(button.closest('.plan-approval-card')?.dataset?.planId || '', 10);
      if (Number.isFinite(planId) && onApprove) {
        onApprove(planId);
      }
    });
  });

  container.querySelectorAll('[data-action="reject"]').forEach((button) => {
    button.addEventListener('click', () => {
      const planId = Number.parseInt(button.closest('.plan-approval-card')?.dataset?.planId || '', 10);
      if (Number.isFinite(planId) && onReject) {
        onReject(planId);
      }
    });
  });
}
