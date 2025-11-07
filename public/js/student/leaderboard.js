import { fetchStudentLeaderboard, fetchStudentPointFeed } from '../modules/apiClient.js';
import { setMessage } from '../modules/dom.js';

function formatTimestamp(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatPoints(points) {
  if (!points) return '0';
  if (points > 0) return `+${points}`;
  return String(points);
}

export function createLeaderboardController(state, elements, showGlobalMessage) {
  const leaderboardState = {
    loading: false,
    loaded: false,
    entries: [],
    leaderboard: [],
    rangeKey: 'today',
    selectedStudentId: null
  };

  const rangeButtons =
    (elements.rangeButtons && elements.rangeButtons.length
      ? elements.rangeButtons
      : elements.range
      ? Array.from(elements.range.querySelectorAll('[data-range]'))
      : []) || [];

  function renderLeaderboard() {
    if (!elements.list) return;
    if (!leaderboardState.leaderboard.length) {
      elements.list.innerHTML = `
        <div class="empty-hint">暂无积分数据，完成任务即可开始积累积分。</div>
      `;
      return;
    }

    elements.list.innerHTML = leaderboardState.leaderboard
      .map((item) => {
        const isSelected =
          leaderboardState.selectedStudentId && leaderboardState.selectedStudentId === item.id;
        const isCurrent = item.isCurrent && !leaderboardState.selectedStudentId;
        return `
          <li class="leaderboard-list__item${
            isCurrent ? ' leaderboard-list__item--current' : ''
          }${isSelected ? ' leaderboard-list__item--selected' : ''}">
            <span class="leaderboard-list__rank">#${item.rank}</span>
            <span class="leaderboard-list__student">
              <button type="button" class="leaderboard-list__student-btn" data-student="${item.id}">
                ${item.name || '同学'}
              </button>
            </span>
            <span class="leaderboard-list__score">${item.points}</span>
          </li>
        `;
      })
      .join('');

    if (elements.message) {
      if (leaderboardState.selectedStudentId) {
        const targetStudent =
          leaderboardState.leaderboard.find((item) => item.id === leaderboardState.selectedStudentId)
            ?.name || '同学';
        setMessage(elements.message, `当前查看：${targetStudent} 的积分动态`, 'info');
      } else {
        setMessage(elements.message, '', '');
      }
    }
  }

  function renderFeed() {
    if (!elements.feed) return;
    if (!leaderboardState.entries.length) {
      elements.feed.innerHTML = `
        <div class="empty-hint">还没有加减分记录，先去完成任务吧！</div>
      `;
      return;
    }

    elements.feed.innerHTML = leaderboardState.entries
      .map((entry) => {
        const pointsClass =
          entry.points > 0
            ? 'leaderboard-feed__points leaderboard-feed__points--positive'
            : entry.points < 0
            ? 'leaderboard-feed__points leaderboard-feed__points--negative'
            : 'leaderboard-feed__points';
        const description =
          entry.note ||
          entry.taskTitle ||
          entry.rewardTitle ||
          (entry.points > 0 ? '积分奖励' : '积分调整');
        return `
          <li class="leaderboard-feed__item">
            <div class="leaderboard-feed__meta">
              <span>${entry.studentName || '同学'}</span>
              <span class="${pointsClass}">${formatPoints(entry.points)}</span>
            </div>
            <div class="leaderboard-feed__meta">
              <span>${formatTimestamp(entry.createdAt)}</span>
              <span>${entry.planDate ? `计划：${entry.planDate}` : ''}</span>
            </div>
            <p class="leaderboard-feed__note">${description}</p>
          </li>
        `;
      })
      .join('');
  }

  function updateRangeUI() {
    rangeButtons.forEach((button) => {
      const range = button.dataset.range;
      const isActive = range === leaderboardState.rangeKey;
      button.classList.toggle('chip-button--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  async function loadLeaderboardData({ silent = false } = {}) {
    if (leaderboardState.loading) return;
    leaderboardState.loading = true;
    if (!silent && elements.message) {
      setMessage(elements.message, '正在加载积分数据...', 'info');
    }

    try {
      const [leaderboardResponse, feedResponse] = await Promise.all([
        fetchStudentLeaderboard(),
        fetchStudentPointFeed(50, leaderboardState.rangeKey, leaderboardState.selectedStudentId)
      ]);
      leaderboardState.leaderboard = leaderboardResponse?.leaderboard ?? [];
      leaderboardState.entries = feedResponse?.entries ?? [];
      leaderboardState.loaded = true;
      if (elements.message) {
        setMessage(elements.message, '', '');
      }
      renderLeaderboard();
      renderFeed();
    } catch (error) {
      if (elements.message) {
        setMessage(elements.message, error.message, 'error');
      } else if (typeof showGlobalMessage === 'function') {
        showGlobalMessage(error.message, 'error');
      }
    } finally {
      leaderboardState.loading = false;
    }
  }

  function ensureLoaded() {
    if (!leaderboardState.loaded) {
      loadLeaderboardData();
    }
  }

  function handleRangeClick(event) {
    const button = event.target.closest('[data-range]');
    if (!button || !rangeButtons.includes(button)) return;
    const rangeKey = (button.dataset.range || 'today').toLowerCase();
    if (rangeKey === leaderboardState.rangeKey) {
      return;
    }
    leaderboardState.rangeKey = rangeKey;
    updateRangeUI();
    loadLeaderboardData({ silent: false });
  }

  if (elements.range && rangeButtons.length) {
    elements.range.addEventListener('click', handleRangeClick);
    updateRangeUI();
  }

  if (elements.list) {
    elements.list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-student]');
      if (!button) return;
      const studentId = Number.parseInt(button.dataset.student, 10);
      if (!Number.isInteger(studentId) || studentId <= 0) return;
      const nextId = leaderboardState.selectedStudentId === studentId ? null : studentId;
      leaderboardState.selectedStudentId = nextId;
      renderLeaderboard();
      loadLeaderboardData({ silent: false });
    });
  }

  return {
    load: loadLeaderboardData,
    ensureLoaded
  };
}
