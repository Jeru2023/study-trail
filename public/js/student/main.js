import {
  getCurrentUser,
  logout,
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsRead
} from '../modules/apiClient.js';
import { qs, setMessage, toggleHidden } from '../modules/dom.js';
import { renderStudentSidebar } from '../components/side_bar_student.js';
import { createTaskController } from './tasks.js';
import { createStoreController } from './store.js';
import { createPlanController } from './plan.js';
import { createLeaderboardController } from './leaderboard.js';

const sidebarRoot = qs('[data-component="student-sidebar"]');
renderStudentSidebar(sidebarRoot);

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateString(value) {
  if (!value) return null;
  const parts = value.split('-').map((part) => Number.parseInt(part, 10));
  if (parts.length === 3 && parts.every((part) => Number.isInteger(part))) {
    const [year, month, day] = parts;
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }
  const fallback = new Date(value);
  if (Number.isNaN(fallback.getTime())) {
    return null;
  }
  return fallback;
}

const state = {
  date: toDateString(new Date()),
  activeView: 'plan',
  tasks: [],
  rewards: [],
  student: null,
  completingEntry: null,
  previewUrls: [],
  remainingCapacity: 6,
  storeLoaded: false,
  notifications: [],
  notificationsUnread: 0,
  plan: null,
  planStatus: 'draft',
  leaderboardLoaded: false
};

const elements = {
  greeting: qs('#studentGreeting'),
  dateText: qs('#studentDateHeading'),
  datePicker: qs('#studentDatePicker'),
  headerTitle: qs('#studentHeaderTitle'),
  logoutBtn: qs('#logoutStudentBtn'),
  navPlan: qs('#studentNavPlan'),
  navTasks: qs('#studentNavTasks'),
  navStore: qs('#studentNavStore'),
  navLeaderboard: qs('#studentNavLeaderboard'),
  navMessages: qs('#studentNavMessages'),
  views: Array.from(document.querySelectorAll('.student-view')),
  pageMessage: qs('#studentPageMessage'),
  notificationsButton: qs('#studentNotificationsButton'),
  notificationsBadge: qs('#studentNotificationsBadge'),
  notificationList: qs('#studentNotificationList'),
  notificationsMessage: qs('#studentNotificationsMessage'),
  notificationsMarkAllBtn: qs('#studentMarkAllNotifications'),
  leaderboard: {
    message: qs('#studentLeaderboardMessage'),
    list: qs('#leaderboardList'),
    feed: qs('#leaderboardFeed'),
    range: qs('#studentLeaderboardRange'),
    rangeButtons: null
  }
};

const planController = createPlanController(
  state,
  {
    section: qs('#studentPlanSection'),
    hint: qs('#studentPlanHint'),
    statusBadge: qs('#studentPlanStatusBadge'),
    banner: qs('#studentPlanBanner'),
    message: qs('#studentPlanMessage'),
    planForm: qs('#studentPlanForm'),
    tabs: qs('#planTaskTabs'),
    titleInput: qs('#planItemTitle'),
    addButton: qs('#planAddButton'),
    emptyHint: qs('#planEmptyHint'),
    list: qs('#planItemList'),
    submitButton: qs('#planSubmitButton')
  },
  showPageMessage
);

const taskController = createTaskController(state, {
  container: qs('#taskContainer'),
  emptyHint: qs('#emptyHint'),
  completeModal: qs('#completeModal'),
  completeForm: qs('#completeForm'),
  completeFormMessage: qs('#completeFormMessage'),
  completeTaskTitle: qs('#completeTaskTitle'),
  completeSubtaskTitle: qs('#completeSubtaskTitle'),
  proofInput: qs('#proofInput'),
  uploadDropzone: qs('#uploadDropzone'),
  uploadPreview: qs('#uploadPreview'),
  proofHint: qs('#proofHint'),
  cancelCompleteBtn: qs('#cancelCompleteBtn'),
  closeCompleteModalBtn: qs('#closeCompleteModal')
}, showPageMessage);

const storeController = createStoreController(state, {
  list: qs('#storeList'),
  message: qs('#storeMessage')
});

const leaderboardController = createLeaderboardController(
  state,
  {
    message: elements.leaderboard.message,
    list: elements.leaderboard.list,
    feed: elements.leaderboard.feed,
    range: elements.leaderboard.range,
    rangeButtons: elements.leaderboard.range
      ? Array.from(elements.leaderboard.range.querySelectorAll('[data-range]'))
      : []
  },
  showPageMessage
);

function formatDateLabel(dateString) {
  const date = parseDateString(dateString) || new Date();
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

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

function formatNotificationTimestamp(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function updateNotificationBadge() {
  const badge = elements.notificationsBadge;
  if (!badge) return;
  const count = state.notificationsUnread;
  if (!count) {
    badge.hidden = true;
    return;
  }
  badge.hidden = false;
  badge.textContent = count > 99 ? '99+' : String(count);
}

function renderNotifications() {
  const container = elements.notificationList;
  if (!container) return;

  const notifications = state.notifications ?? [];
  if (!notifications.length) {
    container.innerHTML = `
      <div class="empty-hint">暂时没有新的消息，继续保持今天的好状态吧！</div>
    `;
    return;
  }

  container.innerHTML = notifications
    .map((notification) => {
      const isUnread = !notification.isRead;
      const createdLabel = formatNotificationTimestamp(notification.createdAt);
      const link = notification.linkUrl
        ? `<a class="student-notification-list__link" data-href="${escapeHtml(notification.linkUrl)}">查看详情</a>`
        : '';
      const body = notification.body
        ? `<p class="student-notification-list__body">${escapeHtml(notification.body)}</p>`
        : '';
      return `
        <li class="student-notification-list__item${isUnread ? ' student-notification-list__item--unread' : ''}" data-href="${escapeHtml(notification.linkUrl ?? '')}">
          <h3 class="student-notification-list__title">${escapeHtml(notification.title)}</h3>
          ${body}
          <div class="student-notification-list__meta">
            <span>${escapeHtml(createdLabel)}</span>
            <span>${link}</span>
          </div>
        </li>
      `;
    })
    .join('');

  container.querySelectorAll('.student-notification-list__link').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      const href = anchor.dataset.href;
      if (href) {
        window.location.href = href;
      }
    });
  });

  container.querySelectorAll('.student-notification-list__item').forEach((item) => {
    const href = item.dataset.href;
    if (!href) return;
    item.addEventListener('click', (event) => {
      if (event.target.closest('.student-notification-list__link')) {
        return;
      }
      window.location.href = href;
    });
  });
}

async function refreshUnreadNotifications() {
  try {
    const { total } = await fetchUnreadNotificationsCount();
    state.notificationsUnread = total ?? 0;
    updateNotificationBadge();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[student notifications] failed to refresh unread count', error);
  }
}

async function loadNotifications({ markRead = false, silent = false } = {}) {
  if (!elements.notificationList) return;

  try {
    if (markRead) {
      await markAllNotificationsRead();
    }

    const { notifications = [] } = await fetchNotifications();
    state.notifications = notifications;
    renderNotifications();

    await refreshUnreadNotifications();

    if (!silent && elements.notificationsMessage) {
      elements.notificationsMessage.hidden = true;
      delete elements.notificationsMessage.dataset.type;
      elements.notificationsMessage.textContent = '';
    }
  } catch (error) {
    if (elements.notificationsMessage) {
      elements.notificationsMessage.hidden = false;
      elements.notificationsMessage.dataset.type = 'error';
      elements.notificationsMessage.textContent = error.message;
    }
  }
}
function showPageMessage(text, type = '') {
  setMessage(elements.pageMessage, text, type);
}

function getActiveView() {
  return state.activeView;
}

function highlightNav(view) {
  [elements.navPlan, elements.navTasks, elements.navStore, elements.navLeaderboard, elements.navMessages].forEach((button) => {
    if (!button) return;
    const active = button.dataset.view === view;
    button.classList.toggle('nav-item--active', active);
  });
}

function showView(view) {
  elements.views.forEach((section) => {
    toggleHidden(section, section.dataset.view !== view);
  });
  highlightNav(view);
}

function updateHeaderTitle(view) {
  if (!elements.headerTitle) return;
  if (view === 'plan') {
    elements.headerTitle.textContent = '每日计划';
  } else if (view === 'tasks') {
    elements.headerTitle.textContent = '每日打卡';
  } else if (view === 'store') {
    elements.headerTitle.textContent = '积分商城';
  } else if (view === 'leaderboard') {
    elements.headerTitle.textContent = '积分榜';
  } else if (view === 'messages') {
    elements.headerTitle.textContent = '消息中心';
  } else {
    elements.headerTitle.textContent = '每日打卡';
  }
}

function updateDateHeader() {
  if (elements.dateText) {
    elements.dateText.textContent = formatDateLabel(state.date);
  }
  if (elements.datePicker && elements.datePicker.value !== state.date) {
    elements.datePicker.value = state.date;
  }
}

async function refreshActiveDate({ silentPlan = false } = {}) {
  await planController.loadPlan({ silent: silentPlan });
  await taskController.loadTasks();
}

async function changeView(view) {
  if (!view || view === getActiveView()) return;
  state.activeView = view;
  updateHeaderTitle(view);
  showView(view);
  if (view === 'plan') {
    await planController.loadPlan({ silent: true });
  } else if (view === 'store') {
    await storeController.loadStore({ silent: state.storeLoaded });
  } else if (view === 'leaderboard') {
    leaderboardController.ensureLoaded();
  } else if (view === 'messages') {
    await loadNotifications({ markRead: true });
  }
}

function registerEvents() {
  if (elements.datePicker) {
    elements.datePicker.addEventListener('change', async (event) => {
      const rawValue = event.target.value;
      const parsed = parseDateString(rawValue);
      if (!parsed) {
        event.target.value = state.date;
        return;
      }
      const normalized = toDateString(parsed);
      if (normalized === state.date) {
        event.target.value = normalized;
        return;
      }
      state.date = normalized;
      updateDateHeader();
      try {
        await refreshActiveDate();
      } catch (error) {
        showPageMessage(error.message || '无法加载所选日期的数据', 'error');
      }
    });
  }
  if (elements.navPlan) {
    elements.navPlan.addEventListener('click', (event) => {
      event.preventDefault();
      changeView('plan');
    });
  }
  if (elements.navTasks) {
    elements.navTasks.addEventListener('click', (event) => {
      event.preventDefault();
      changeView('tasks');
    });
  }
  if (elements.navStore) {
    elements.navStore.addEventListener('click', (event) => {
      event.preventDefault();
      changeView('store');
    });
  }
  if (elements.navLeaderboard) {
    elements.navLeaderboard.addEventListener('click', (event) => {
      event.preventDefault();
      changeView('leaderboard');
    });
  }
  if (elements.navMessages) {
    elements.navMessages.addEventListener('click', (event) => {
      event.preventDefault();
      changeView('messages');
    });
  }
  if (elements.notificationsButton) {
    elements.notificationsButton.addEventListener('click', (event) => {
      event.preventDefault();
      changeView('messages');
    });
  }
  if (elements.notificationsMarkAllBtn) {
    elements.notificationsMarkAllBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await loadNotifications({ markRead: true, silent: true });
        if (elements.notificationsMessage) {
          elements.notificationsMessage.hidden = false;
          elements.notificationsMessage.dataset.type = 'success';
          elements.notificationsMessage.textContent = '已将所有消息标记为已读';
        }
      } catch (error) {
        if (elements.notificationsMessage) {
          elements.notificationsMessage.hidden = false;
          elements.notificationsMessage.dataset.type = 'error';
          elements.notificationsMessage.textContent = error.message;
        }
      }
    });
  }

  planController.registerEvents();
  taskController.registerEvents();

  elements.logoutBtn?.addEventListener('click', async () => {
    try {
      await logout();
    } finally {
      window.location.href = '/';
    }
  });
}

async function ensureStudentSession() {
  try {
    const { user } = await getCurrentUser();
    if (!user || user.role !== 'student') {
      window.location.href = '/';
      return false;
    }
    state.student = user;
    const displayName = user.name || user.loginName;
    if (elements.greeting) {
      elements.greeting.textContent = displayName || '';
    }
    return true;
  } catch (error) {
    window.location.href = '/';
    return false;
  }
}

async function bootstrap() {
  updateDateHeader();
  registerEvents();
  if (!(await ensureStudentSession())) {
    return;
  }
  await refreshUnreadNotifications();
  updateDateHeader();
  updateHeaderTitle(getActiveView());
  showView(getActiveView());
  await refreshActiveDate();
  await storeController.loadStore({ silent: true });
}

document.addEventListener('DOMContentLoaded', bootstrap);
