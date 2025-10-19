function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

function formatSourceLabel(source) {
  switch (source) {
    case 'task':
      return '打卡奖励';
    case 'manual':
      return '手动调整';
    case 'reward_redeem':
      return '奖励兑换';
    default:
      return '其他';
  }
}

export function formatPointsValue(value) {
  if (value > 0) {
    return `+${value}`;
  }
  if (value < 0) {
    return `${value}`;
  }
  return '0';
}

export function renderPointsStudentList(container, students, activeStudentId) {
  if (!container) return;

  if (!students || students.length === 0) {
    container.innerHTML =
      '<p class="empty-hint">暂未添加学生账号，请先在“学生账号”中创建。</p>';
    return;
  }

  container.innerHTML = students
    .map((student) => {
      const displayName = student.displayName || student.loginName;
      const activeClass = student.id === activeStudentId ? ' points-student--active' : '';
      const lastActivity = student.lastActivityAt
        ? `最近更新：${formatDateTime(student.lastActivityAt)}`
        : '暂无积分记录';

      return `
        <article class="points-student${activeClass}" data-student-id="${student.id}">
          <div class="points-student__header">
            <span class="points-student__name">${displayName}</span>
            <span class="points-student__balance">${student.pointsBalance} 积分</span>
          </div>
          <div class="points-student__meta">
            <span>登录名：${student.loginName}</span>
            <span>累计获得：${student.earnedTotal} 积分</span>
            <span>累计使用：${student.spentTotal} 积分</span>
            <span>${lastActivity}</span>
          </div>
        </article>
      `;
    })
    .join('');
}

export function renderPointsHistory(listElement, entries) {
  if (!listElement) return;

  if (!entries || entries.length === 0) {
    listElement.innerHTML =
      '<li class="points-history__item"><p class="points-history__item-note">暂无积分记录。</p></li>';
    return;
  }

  listElement.innerHTML = entries
    .map((entry) => {
      const valueClass =
        entry.points >= 0
          ? 'points-history__item-value points-history__item-value--positive'
          : 'points-history__item-value points-history__item-value--negative';
      const noteContent = entry.note
        ? `<p class="points-history__item-note">${entry.note}</p>`
        : '';

      const extraMeta = [];
      if (entry.source === 'task' && entry.taskTitle) {
        extraMeta.push(`来源任务：${entry.taskTitle}`);
      }
      if (entry.source === 'reward_redeem' && entry.rewardTitle) {
        extraMeta.push(`兑换奖励：${entry.rewardTitle}`);
      }
      if (entry.quantity) {
        extraMeta.push(`数量：${entry.quantity}`);
      }

      const metaText = [formatDateTime(entry.createdAt), ...extraMeta].filter(Boolean).join(' · ');

      return `
        <li class="points-history__item">
          <div class="points-history__item-header">
            <span class="points-history__item-source">${formatSourceLabel(entry.source)}</span>
            <span class="${valueClass}">${formatPointsValue(entry.points)}</span>
          </div>
          ${noteContent}
          <p class="points-history__item-meta">${metaText}</p>
        </li>
      `;
    })
    .join('');
}
