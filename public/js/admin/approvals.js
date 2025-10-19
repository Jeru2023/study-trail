const TEXT = {
  emptyTitle: '今日还没有打卡记录',
  emptySubtitle: '孩子们还在努力中，请稍后再来看看～',
  status: {
    pending: '未开始',
    in_progress: '进行中',
    completed: '已提交'
  },
  review: {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回'
  },
  approve: '通过',
  reject: '驳回',
  delete: '删除',
  proofsEmpty: '暂未上传附件',
  noteLabel: '审批备注（可选）',
  notePlaceholder: '例如：表现很好，继续保持哦~'
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

function normalizeAssetUrl(url) {
  if (!url) return '';
  let normalized = String(url).replace(/\\/g, '/').trim();
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized) || normalized.startsWith('data:')) {
    return normalized;
  }
  normalized = normalized.replace(/^\.\/+/, '/').replace(/^\/+/, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function buildAssetHref(url) {
  const normalized = normalizeAssetUrl(url);
  try {
    // Use absolute URL so that new tabs resolve correctly even across hosts
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(normalized, origin).toString();
  } catch (_error) {
    return normalized;
  }
}

function formatDateTime(value) {
  if (!value) return '--';
  let normalized = value;
  if (typeof value === 'string' && value.includes(' ')) {
    normalized = value.replace(' ', 'T');
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.toLocaleDateString('zh-CN')} ${date
    .toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    .replace(/^[^\d]*/, '')}`;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) {
    return '不到 1 分钟';
  }
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) {
    return `${hours} 小时 ${minutes} 分钟`;
  }
  if (hours) {
    return `${hours} 小时`;
  }
  return `${minutes} 分钟`;
}

function getReviewBadge(reviewStatus) {
  const status = reviewStatus || 'pending';
  const text = TEXT.review[status] ?? status;
  return `<span class="approval-card__badge approval-card__badge--${escapeHtml(
    status
  )}">${escapeHtml(text)}</span>`;
}

function renderProofs(proofs) {
  if (!proofs?.length) {
    return `<p class="approval-card__review-note">${TEXT.proofsEmpty}</p>`;
  }

  const items = proofs
    .map((proof, index) => {
      const assetHref = buildAssetHref(proof.url);
      const safeHref = escapeHtml(assetHref);
      const safeName = escapeHtml(proof.originalName || `附件 ${index + 1}`);
      if (proof.type === 'video') {
        return `
          <a class="approval-card__asset" href="${safeHref}" target="_blank" rel="noopener noreferrer">
            <video src="${safeHref}" muted playsinline></video>
            <span class="approval-card__asset-badge">视频</span>
          </a>
        `;
      }
      return `
        <a class="approval-card__asset" href="${safeHref}" target="_blank" rel="noopener noreferrer">
          <img src="${safeHref}" alt="${safeName}" />
        </a>
      `;
    })
    .join('');

  return `<div class="approval-card__assets">${items}</div>`;
}

function buildApprovalCard(entry, { onApprove, onReject, onDelete }) {
  const taskTitle = escapeHtml(entry.task?.title || '未命名任务');
  const subtaskTitle = escapeHtml(entry.title || '未命名子任务');
  const studentName = escapeHtml(entry.student?.name || entry.student?.loginName || '未命名孩子');
  const studentLogin = escapeHtml(entry.student?.loginName || '');
  const points = Number(entry.task?.points) || 0;
  const canReview = entry.status === 'completed' && entry.reviewStatus !== 'approved';
  const statusText = TEXT.status[entry.status] ?? entry.status;
  const reviewBadge = getReviewBadge(entry.reviewStatus);
  const reviewNote =
    entry.reviewNotes && entry.reviewStatus === 'rejected'
      ? `<p class="approval-card__review-note">家长备注：${escapeHtml(entry.reviewNotes)}</p>`
      : '';

  const bodyNotes = entry.notes
    ? `<p class="approval-card__notes">${escapeHtml(entry.notes)}</p>`
    : '';

  const proofSection = renderProofs(entry.proofs);
  const approveDisabled = canReview ? '' : 'disabled';
  const rejectDisabled = canReview ? '' : 'disabled';
  const deleteDisabled = entry.reviewStatus === 'approved' ? 'disabled' : '';
  const noteInput = canReview
    ? `
      <label class="approval-card__note">
        <span>${escapeHtml(TEXT.noteLabel)}</span>
        <textarea data-review-note placeholder="${escapeHtml(TEXT.notePlaceholder)}"></textarea>
      </label>
    `
    : '';

  return `
    <article class="approval-card" data-entry="${entry.id}">
      <div class="approval-card__header">
        <div>
          <h3 class="approval-card__title">${taskTitle}</h3>
          <p class="approval-card__subtask">子任务：${subtaskTitle}</p>
          <p class="approval-card__student">孩子：${studentName}${
    studentLogin ? `（${studentLogin}）` : ''
  }</p>
        </div>
        <div class="approval-card__meta">
          <span class="approval-card__points">+${points} 积分</span>
          ${reviewBadge}
        </div>
      </div>
      <div class="approval-card__details">
        <span>进度状态：${escapeHtml(statusText)}</span>
        <span>开始时间：${escapeHtml(formatDateTime(entry.startedAt))}</span>
        <span>完成时间：${escapeHtml(formatDateTime(entry.completedAt))}</span>
        <span>耗时：${escapeHtml(formatDuration(entry.durationSeconds))}</span>
      </div>
      ${bodyNotes}
      ${proofSection}
      ${reviewNote}
      ${noteInput}
      <div class="approval-card__actions">
        <button type="button" class="primary-button" data-action="approve" ${approveDisabled}>${TEXT.approve}</button>
        <button type="button" class="ghost-button" data-action="reject" ${rejectDisabled}>${TEXT.reject}</button>
        <button type="button" class="ghost-button" data-action="delete" ${deleteDisabled}>${TEXT.delete}</button>
      </div>
    </article>
  `;
}

export function renderApprovalList(container, entries, { onApprove, onReject, onDelete }) {
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>${TEXT.emptyTitle}</strong>
        <span>${TEXT.emptySubtitle}</span>
      </div>
    `;
    return;
  }

  container.innerHTML = entries
    .map((entry) => buildApprovalCard(entry, { onApprove, onReject, onDelete }))
    .join('');

  container.querySelectorAll('[data-action="approve"]').forEach((button) => {
    button.addEventListener('click', () => {
      const entryId = Number.parseInt(button.closest('.approval-card')?.dataset?.entry || '', 10);
      if (Number.isFinite(entryId) && onApprove) {
        const card = button.closest('.approval-card');
        const note = card?.querySelector('[data-review-note]')?.value?.trim() || '';
        onApprove(entryId, note);
      }
    });
  });

  container.querySelectorAll('[data-action="reject"]').forEach((button) => {
    button.addEventListener('click', () => {
      const entryId = Number.parseInt(button.closest('.approval-card')?.dataset?.entry || '', 10);
      if (Number.isFinite(entryId) && onReject) {
        const card = button.closest('.approval-card');
        const note = card?.querySelector('[data-review-note]')?.value?.trim() || '';
        onReject(entryId, note);
      }
    });
  });

  container.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.addEventListener('click', () => {
      const entryId = Number.parseInt(button.closest('.approval-card')?.dataset?.entry || '', 10);
      if (Number.isFinite(entryId) && onDelete) {
        onDelete(entryId);
      }
    });
  });
}
