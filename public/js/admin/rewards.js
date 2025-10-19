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
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

const EMPTY_STATE = {
  title: '尚未添加任何奖励',
  subtitle: '设置可兑换的奖励，激励孩子完成每日打卡。'
};

function formatPoints(points) {
  const value = Number(points) || 0;
  return `${value} 积分`;
}

function formatStock(stock) {
  if (stock === null || stock === undefined) {
    return '不限量';
  }
  return `${stock} 件`;
}

function renderReward(reward, { onEdit, onDelete }) {
  const statusTag = reward.isActive
    ? '<span class="reward-card__status reward-card__status--active">上架中</span>'
    : '<span class="reward-card__status reward-card__status--inactive">已下架</span>';

  return `
    <article class="reward-card" data-reward="${reward.id}">
      <div class="reward-card__main">
        <div>
          <h3 class="reward-card__title">${escapeHtml(reward.title)}</h3>
          ${statusTag}
        </div>
        <dl class="reward-card__meta">
          <div>
            <dt>所需积分</dt>
            <dd>${formatPoints(reward.pointsCost)}</dd>
          </div>
          <div>
            <dt>库存</dt>
            <dd>${formatStock(reward.stock)}</dd>
          </div>
          <div>
            <dt>更新时间</dt>
            <dd>${new Date(reward.updatedAt).toLocaleString('zh-CN')}</dd>
          </div>
        </dl>
        ${reward.description ? `<p class="reward-card__description">${escapeHtml(reward.description)}</p>` : ''}
      </div>
      <div class="reward-card__actions">
        <button type="button" class="ghost-button" data-action="edit" data-reward="${reward.id}">编辑</button>
        <button type="button" class="ghost-button ghost-button--danger" data-action="delete" data-reward="${reward.id}">删除</button>
      </div>
    </article>
  `;
}

export function renderRewardList(container, rewards, { onEdit, onDelete }) {
  if (!container) return;

  if (!rewards.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>${EMPTY_STATE.title}</strong>
        <span>${EMPTY_STATE.subtitle}</span>
      </div>
    `;
    return;
  }

  container.innerHTML = rewards.map((reward) => renderReward(reward, { onEdit, onDelete })).join('');

  container.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const rewardId = Number.parseInt(button.dataset.reward || '', 10);
      if (Number.isFinite(rewardId) && onEdit) {
        onEdit(rewardId);
      }
    });
  });

  container.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.addEventListener('click', () => {
      const rewardId = Number.parseInt(button.dataset.reward || '', 10);
      if (Number.isFinite(rewardId) && onDelete) {
        onDelete(rewardId);
      }
    });
  });
}

export function populateRewardForm(form, reward) {
  if (!form || !reward) return;
  form.elements.title.value = reward.title || '';
  form.elements.pointsCost.value = reward.pointsCost ?? 0;
  form.elements.stock.value = reward.stock ?? '';
  form.elements.isActive.checked = Boolean(reward.isActive);
  form.elements.description.value = reward.description || '';
}

export function resetRewardForm(form) {
  if (!form) return;
  form.reset();
  form.elements.pointsCost.value = '';
  form.elements.stock.value = '';
  form.elements.isActive.checked = true;
}

export function readRewardForm(form) {
  if (!form) return null;
  const title = form.elements.title.value.trim();
  const pointsCost = form.elements.pointsCost.value.trim();
  const stockValue = form.elements.stock.value.trim();
  const description = form.elements.description.value.trim();
  const isActive = form.elements.isActive.checked;

  return {
    title,
    pointsCost: pointsCost === '' ? 0 : Number.parseInt(pointsCost, 10),
    stock: stockValue === '' ? null : Number.parseInt(stockValue, 10),
    description: description || null,
    isActive
  };
}
