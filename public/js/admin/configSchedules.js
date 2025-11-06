import {
  getCurrentUser,
  fetchTaskOverrides,
  upsertTaskOverride,
  deleteTaskOverride,
  fetchUnreadNotificationsCount,
  logout
} from '../modules/apiClient.js';
import { qs, qsa, setMessage, disableForm } from '../modules/dom.js';
import {
  getTaskOverrides,
  setTaskOverrides,
  setNotificationsUnread,
  getNotificationsUnread,
  setUser
} from './state.js';
import { setupTaskTypeToggle } from './tasks.js';

const TEXT = {
  loading: '正在加载日期调度…',
  loadError: '调度数据获取失败，请稍后再试。',
  saveInProgress: '正在保存调度…',
  saveSuccess: '调度已保存，并将按时生效。',
  deleteConfirm: (label) => `确定要删除调度「${label}」吗？删除后将恢复默认任务安排。`,
  deleteSuccess: '调度已删除。',
  dateRequired: '请选择开始和结束日期。',
  dateInvalid: '结束日期不能早于开始日期。',
  scheduleRequired: '请选择任务展示策略。'
};

const STATUS_LABELS = {
  active: '进行中',
  upcoming: '即将生效',
  past: '已结束'
};

const FILTER_LABELS = {
  all: '全部',
  active: '进行中',
  upcoming: '即将生效',
  past: '已结束'
};

function toggleSidebarSection(button) {
  if (!button) return;
  const section = button.closest('.sidebar-section');
  const contentId = button.getAttribute('aria-controls');
  const content = contentId ? document.getElementById(contentId) : null;
  const expanded = button.getAttribute('aria-expanded') === 'true';
  const nextExpanded = !expanded;
  button.setAttribute('aria-expanded', String(nextExpanded));
  if (section) {
    section.classList.toggle('is-collapsed', !nextExpanded);
  }
  if (content) {
    content.setAttribute('aria-hidden', nextExpanded ? 'false' : 'true');
  }
}

const elements = {
  navContainer: qs('.sidebar__nav'),
  notificationsButton: qs('#notificationsButton'),
  notificationsBadge: qs('#notificationsBadge'),
  logoutButton: qs('#logoutButton'),
  avatar: {
    sidebar: qs('#sidebarAvatar'),
    topbar: qs('#topbarAvatar')
  },
  name: {
    sidebar: qs('#sidebarUserName'),
    topbar: qs('#topbarUserName')
  },
  summary: {
    active: qs('#summaryActiveValue'),
    upcoming: qs('#summaryUpcomingValue'),
    total: qs('#summaryTotalValue')
  },
  scheduleBoard: qs('#scheduleBoard'),
  scheduleMessage: qs('#scheduleMessage'),
  scheduleForm: qs('#scheduleForm'),
  scheduleFormMessage: qs('#scheduleFormMessage'),
  scheduleResetBtn: qs('#scheduleResetBtn'),
  filterButtons: qsa('[data-filter]')
};

let activeFilter = 'all';

function updateNotificationBadge() {
  if (!elements.notificationsBadge) return;
  const unread = getNotificationsUnread();
  if (!unread) {
    elements.notificationsBadge.hidden = true;
    return;
  }
  elements.notificationsBadge.hidden = false;
  elements.notificationsBadge.textContent = unread > 99 ? '99+' : String(unread);
}

async function refreshUnreadNotifications() {
  try {
    const { total } = await fetchUnreadNotificationsCount();
    setNotificationsUnread(total ?? 0);
    updateNotificationBadge();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[schedule] failed to refresh unread notifications', error);
  }
}

function updateUserDisplay(user) {
  if (!user) return;
  const displayName = user.name || user.loginName || 'Parent';
  const initial = displayName.charAt(0).toUpperCase();
  if (elements.avatar.sidebar) elements.avatar.sidebar.textContent = initial;
  if (elements.avatar.topbar) elements.avatar.topbar.textContent = initial;
  if (elements.name.sidebar) elements.name.sidebar.textContent = displayName;
  if (elements.name.topbar) elements.name.topbar.textContent = displayName;
}

function parseDate(value) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function compareByDate(a, b) {
  const aDate = parseDate(a.startDate) ?? new Date(0);
  const bDate = parseDate(b.startDate) ?? new Date(0);
  return aDate.getTime() - bDate.getTime();
}

function getStatus(override) {
  const start = parseDate(override.startDate);
  const end = parseDate(override.endDate);
  if (!start || !end) return 'past';
  const today = todayStart();
  if (start <= today && today <= end) return 'active';
  if (start > today) return 'upcoming';
  return 'past';
}

function formatDateLabel(value) {
  if (!value) return '--';
  const date = parseDate(value);
  if (!date) return value;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function formatDateRange(start, end) {
  const startLabel = formatDateLabel(start);
  const endLabel = formatDateLabel(end);
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

function formatScheduleType(type, recurringDay) {
  if (type === 'holiday') return '节假任务';
  if (type === 'recurring') {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const index = Number.parseInt(recurringDay, 10);
    if (Number.isInteger(index) && index >= 0 && index <= 6) {
      return `定期任务 · ${weekdays[index]}`;
    }
    return '定期任务';
  }
  return '日常任务';
}

function renderSummary() {
  const overrides = getTaskOverrides() ?? [];
  const today = todayStart();
  let activeCount = 0;
  let upcomingCount = 0;
  overrides.forEach((item) => {
    const start = parseDate(item.startDate);
    if (!start) return;
    const status = getStatus(item);
    if (status === 'active') {
      activeCount += 1;
    } else if (status === 'upcoming') {
      const startDiff = (start - today) / (1000 * 60 * 60 * 24);
      if (startDiff <= 30) {
        upcomingCount += 1;
      }
    }
  });
  if (elements.summary.active) elements.summary.active.textContent = String(activeCount);
  if (elements.summary.upcoming) elements.summary.upcoming.textContent = String(upcomingCount);
  if (elements.summary.total) elements.summary.total.textContent = String(overrides.length);
}

function renderEmptyState() {
  if (!elements.scheduleBoard) return;
  elements.scheduleBoard.innerHTML = `
    <div class="empty-state">
      <strong>还没有日期调度</strong>
      <span>创建一条调度，就能在特殊日期自动切换任务展示策略。</span>
    </div>
  `;
}

function renderScheduleBoard() {
  const overrides = [...(getTaskOverrides() ?? [])].sort(compareByDate);
  if (!overrides.length) {
    renderEmptyState();
    return;
  }
  const filtered = overrides.filter((item) => {
    if (activeFilter === 'all') return true;
    return getStatus(item) === activeFilter;
  });
  if (!filtered.length) {
    if (elements.scheduleBoard) {
      const label = FILTER_LABELS[activeFilter] || '当前筛选';
      elements.scheduleBoard.innerHTML = `
        <div class="empty-state">
          <strong>${label}暂无记录</strong>
          <span>调整筛选条件或新建覆盖试试看。</span>
        </div>
      `;
    }
    return;
  }
  const today = todayStart();
  const fragments = filtered.map((item) => {
    const status = getStatus(item);
    const statusLabel = STATUS_LABELS[status] || '进行中';
    const rangeLabel = formatDateRange(item.startDate, item.endDate);
    const scheduleLabel = formatScheduleType(item.scheduleType, item.recurringDayOfWeek);
    const note = item.note ? `<p class="schedule-entry__note">${item.note}</p>` : '';
    const isCurrent = status === 'active';
    const isUpcoming = status === 'upcoming';
    const startDate = parseDate(item.startDate);
    const countdown =
      isUpcoming && startDate
        ? Math.max(0, Math.round((startDate - today) / (1000 * 60 * 60 * 24)))
        : null;
    const countdownLabel =
      countdown !== null ? `<span class="schedule-entry__countdown">还有 ${countdown} 天生效</span>` : '';
    return `
      <article class="schedule-entry schedule-entry--${status}">
        <div class="schedule-entry__meta">
          <span class="schedule-entry__status">${statusLabel}</span>
          <span class="schedule-entry__range">${rangeLabel}</span>
          ${countdownLabel}
        </div>
        <div class="schedule-entry__body">
          <h3 class="schedule-entry__title">${scheduleLabel}</h3>
          ${note}
        </div>
        <div class="schedule-entry__actions">
          <button type="button" class="ghost-button ghost-button--small" data-action="delete" data-id="${item.id}">
            删除
          </button>
        </div>
        ${
          isCurrent
            ? '<span class="schedule-entry__badge schedule-entry__badge--live">今日生效</span>'
            : ''
        }
      </article>
    `;
  });
  if (elements.scheduleBoard) {
    elements.scheduleBoard.innerHTML = fragments.join('');
    elements.scheduleBoard.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = Number.parseInt(button.dataset.id, 10);
        if (!Number.isInteger(id)) return;
        handleDeleteOverride(id);
      });
    });
  }
}

function renderAll() {
  renderSummary();
  renderScheduleBoard();
  if (elements.scheduleMessage) setMessage(elements.scheduleMessage, '', '');
}

async function loadOverrides({ silent = false } = {}) {
  if (!silent && elements.scheduleMessage) {
    setMessage(elements.scheduleMessage, TEXT.loading, 'info');
  }
  try {
    const { overrides } = await fetchTaskOverrides();
    setTaskOverrides(overrides ?? []);
    renderAll();
  } catch (error) {
    if (elements.scheduleMessage) {
      setMessage(elements.scheduleMessage, error.message || TEXT.loadError, 'error');
    }
    renderEmptyState();
  }
}

function resetForm() {
  if (!elements.scheduleForm) return;
  elements.scheduleForm.reset();
  setupTaskTypeToggle(elements.scheduleForm);
  if (elements.scheduleFormMessage) setMessage(elements.scheduleFormMessage, '', '');
}

function getFormPayload() {
  if (!elements.scheduleForm) return null;
  const form = elements.scheduleForm;
  const startDate = form.elements.startDate.value;
  const endDate = form.elements.endDate.value;
  const scheduleType = form.elements.scheduleType.value;
  const recurringDayRaw = form.elements.recurringDayOfWeek?.value ?? '';
  const recurringDay = Number.parseInt(recurringDayRaw, 10);
  const note = form.elements.note.value.trim();
  return {
    startDate,
    endDate,
    scheduleType,
    recurringDayOfWeek: Number.isInteger(recurringDay) ? recurringDay : null,
    note: note || null
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  const payload = getFormPayload();
  if (!payload) return;
  if (!payload.startDate || !payload.endDate) {
    setMessage(elements.scheduleFormMessage, TEXT.dateRequired, 'error');
    return;
  }
  const start = parseDate(payload.startDate);
  const end = parseDate(payload.endDate);
  if (!start || !end || end < start) {
    setMessage(elements.scheduleFormMessage, TEXT.dateInvalid, 'error');
    return;
  }
  if (!payload.scheduleType) {
    setMessage(elements.scheduleFormMessage, TEXT.scheduleRequired, 'error');
    return;
  }

  try {
    disableForm(elements.scheduleForm, true);
    setMessage(elements.scheduleFormMessage, TEXT.saveInProgress, 'info');
    await upsertTaskOverride({
      startDate: payload.startDate,
      endDate: payload.endDate,
      scheduleType: payload.scheduleType,
      note: payload.note,
      recurringDayOfWeek: payload.scheduleType === 'recurring' ? payload.recurringDayOfWeek : null
    });
    setMessage(elements.scheduleFormMessage, TEXT.saveSuccess, 'success');
    resetForm();
    await loadOverrides({ silent: true });
  } catch (error) {
    setMessage(elements.scheduleFormMessage, error.message || TEXT.loadError, 'error');
  } finally {
    disableForm(elements.scheduleForm, false);
  }
}

async function handleDeleteOverride(overrideId) {
  const overrides = getTaskOverrides() ?? [];
  const target = overrides.find((item) => item.id === overrideId);
  const label = target ? formatDateRange(target.startDate, target.endDate) : '';
  const confirmed = window.confirm(TEXT.deleteConfirm(label));
  if (!confirmed) return;
  try {
    await deleteTaskOverride(overrideId);
    if (elements.scheduleMessage) {
      setMessage(elements.scheduleMessage, TEXT.deleteSuccess, 'success');
    }
    await loadOverrides({ silent: true });
  } catch (error) {
    if (elements.scheduleMessage) {
      setMessage(elements.scheduleMessage, error.message || TEXT.loadError, 'error');
    }
  }
}

function handleFilterChange(filter) {
  activeFilter = filter;
  elements.filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle('chip-button--active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  renderScheduleBoard();
}

function setupFilters() {
  elements.filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const { filter } = button.dataset;
      if (!filter) return;
      handleFilterChange(filter);
    });
  });
}

function setupNavigation() {
  if (elements.navContainer) {
    elements.navContainer.addEventListener('click', (event) => {
      const sectionToggle = event.target.closest('[data-section-toggle]');
      if (sectionToggle) {
        toggleSidebarSection(sectionToggle);
        return;
      }
      const target = event.target.closest('[data-link]');
      if (!target) return;
      event.preventDefault();
      const href = target.dataset.link;
      if (href) {
        window.location.href = href;
      }
    });
  }
  if (elements.notificationsButton) {
    elements.notificationsButton.addEventListener('click', (event) => {
      event.preventDefault();
      const href = elements.notificationsButton.dataset.link;
      if (href) {
        window.location.href = href;
      }
    });
  }
}

async function handleLogout() {
  try {
    await logout();
  } finally {
    window.location.href = '/';
  }
}

async function bootstrap() {
  try {
    const { user } = await getCurrentUser();
    if (!user || user.role !== 'parent') {
      window.location.href = '/';
      return;
    }
    setUser(user);
    updateUserDisplay(user);
    await refreshUnreadNotifications();
    await loadOverrides({ silent: false });
  } catch (error) {
    window.location.href = '/';
  }
}

function main() {
  setupNavigation();
  setupFilters();
  if (elements.scheduleForm) {
    setupTaskTypeToggle(elements.scheduleForm);
    elements.scheduleForm.addEventListener('submit', handleSubmit);
  }
  if (elements.scheduleResetBtn) {
    elements.scheduleResetBtn.addEventListener('click', () => {
      window.setTimeout(() => {
        setupTaskTypeToggle(elements.scheduleForm);
        if (elements.scheduleFormMessage) setMessage(elements.scheduleFormMessage, '', '');
      }, 0);
    });
  }
  if (elements.logoutButton) {
    elements.logoutButton.addEventListener('click', handleLogout);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshUnreadNotifications();
    }
  });
  bootstrap();
}

document.addEventListener('DOMContentLoaded', main);
