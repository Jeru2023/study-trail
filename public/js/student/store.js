import { fetchRewards } from '../modules/apiClient.js';
import { setMessage, toggleHidden } from '../modules/dom.js';

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

function formatRewardStock(stock) {
  if (stock === null || stock === undefined) {
    return '不限量';
  }
  if (stock === 0) {
    return '已兑完';
  }
  return `剩余 ${stock} 件`;
}

function renderStoreCard(reward) {
  const description = reward.description
    ? `<p class="store-card__description">${escapeHtml(reward.description)}</p>`
    : '';

  return `
    <article class="store-card">
      <div class="store-card__header">
        <h3 class="store-card__title">${escapeHtml(reward.title)}</h3>
        <span class="store-card__points">${reward.pointsCost} 积分</span>
      </div>
      ${description}
      <div class="store-card__footer">
        <span class="store-card__stock">${escapeHtml(formatRewardStock(reward.stock))}</span>
      </div>
    </article>
  `;
}

export function createStoreController(state, elements) {
  function renderStore() {
    if (!elements.list) return;
    if (!state.rewards.length) {
      elements.list.innerHTML = '';
      if (elements.message) {
        setMessage(elements.message, '暂无上架的奖励，继续努力赚积分吧！', '');
        toggleHidden(elements.message, false);
      }
      return;
    }

    elements.list.innerHTML = state.rewards.map((reward) => renderStoreCard(reward)).join('');
    if (elements.message) {
      setMessage(elements.message, '', '');
      toggleHidden(elements.message, true);
    }
  }

  async function loadStore({ silent } = {}) {
    if (!elements.list) return;
    try {
      if (!silent) {
        elements.list.innerHTML = `<p class="loading">正在加载奖励...</p>`;
        if (elements.message) {
          toggleHidden(elements.message, true);
        }
      }
      const { rewards } = await fetchRewards();
      state.rewards = rewards ?? [];
      state.storeLoaded = true;
      renderStore();
    } catch (error) {
      state.rewards = [];
      state.storeLoaded = false;
      elements.list.innerHTML = '';
      if (elements.message) {
        setMessage(elements.message, error.message, 'error');
        toggleHidden(elements.message, false);
      }
    }
  }

  return {
    loadStore
  };
}
