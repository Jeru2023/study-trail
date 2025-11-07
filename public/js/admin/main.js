import {
  getCurrentUser,
  fetchApprovalEntries,
  fetchParentPlans,
  fetchRewards,
  approveStudentEntry,
  rejectStudentEntry,
  deleteApprovalEntry,
  approveParentPlan,
  rejectParentPlan,
  awardTaskPoints,
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
  fetchAnalyticsDashboard,
  fetchAnalyticsStudentHistory,
  logout
} from '../modules/apiClient.js';
import { qs, qsa, setMessage, disableForm, toggleHidden } from '../modules/dom.js';
import { renderParentSidebar } from '../components/side_bar_parent.js';
import {
  getActiveView,
  getNotifications,
  getNotificationsUnread,
  getApprovals,
  getApprovalsDate,
  getApprovalsTab,
  getPlanApprovals,
  getPlanApprovalsStatus,
  getRewards,
  setActiveView,
  setNotifications,
  setNotificationsUnread,
  setApprovals,
  setApprovalsDate,
  setApprovalsTab,
  setPlanApprovals,
  setPlanApprovalsStatus,
  setRewards,
  getAnalyticsDashboard,
  setAnalyticsDashboard,
  getAnalyticsFilters,
  setAnalyticsFilters,
  getAnalyticsRange,
  setAnalyticsRange,
  getAnalyticsStudentId,
  setAnalyticsStudentId,
  getAnalyticsStudentHistory,
  setAnalyticsStudentHistory,
  setUser
} from './state.js';
import { renderApprovalList } from './approvals.js';
import { renderPlanApprovalList } from './planApprovals.js';
import {
  SOURCE_GROUPS,
  deriveSourcesFromGroups,
  renderAnalyticsSummary,
  renderAnalyticsLeaderboard,
  renderAnalyticsTrend,
  renderAnalyticsSourceBreakdown,
  renderAnalyticsStudentSummary,
  renderAnalyticsHistory
} from './analytics.js';

const sidebarRoot = qs('[data-component="parent-sidebar"]');
renderParentSidebar(sidebarRoot);

const TEXT = {
  notifications: {
    loading: '正在加载通知...',
    emptyTitle: '暂时没有通知',
    emptySubtitle: '当有新的动态时会第一时间告诉你。',
    markAll: '全部设为已读',
    markAllSuccess: '已将所有消息标记为已读'
  },
  approval: {
    tabs: {
      pending: '待审批',
      unsubmitted: '未提交',
      completed: '已完成'
    },
    emptyPendingTitle: '今日暂无待审批任务',
    emptyPendingSubtitle: '孩子们暂未提交新的打卡记录，请稍后再来查看。',
    emptyUnsubmittedTitle: '今日暂无未提交任务',
    emptyUnsubmittedSubtitle: '孩子们还未提交新的打卡，记得提醒他们按时完成哦。',
    emptyCompletedTitle: '今日暂无已完成任务',
    emptyCompletedSubtitle: '审批通过后，这里会显示已完成的打卡记录。',
    loading: '正在获取今日打卡记录...',
    refreshSuccess: '审批列表已更新',
    approveConfirm: '确认通过该打卡记录吗？',
    approveSuccess: '已通过审批',
    rejectConfirm: '确认要驳回该打卡记录吗？',
    rejectSuccess: '已驳回，请提醒孩子重新补打卡',
    deleteConfirm: '确认要删除这条打卡记录吗？完成的证据也会一并移除。',
    deleteSuccess: '记录已删除',
    awardConfirm: (task, student) =>
      `确认要为「${task || '该任务'}」发放积分给 ${student || '孩子'} 吗？`,
    awardInProgress: '正在发放积分...',
    awardSuccess: '任务积分已发放'
  },
  planApproval: {
    tabs: {
      submitted: '待审批',
      approved: '已通过',
      rejected: '已驳回'
    },
    loading: '正在加载学习计划...',
    loadFailed: '学习计划加载失败',
    empty: {
      submitted: {
        title: '暂无待审批的学习计划',
        subtitle: '孩子们还在准备今日计划，请稍后再查看。'
      },
      approved: {
        title: '暂无已通过的计划记录',
        subtitle: '通过审批的计划将会显示在这里。'
      },
      rejected: {
        title: '暂无已驳回的计划记录',
        subtitle: '若计划被驳回，会列在这里。'
      }
    },
    approveConfirm: '确认通过该学习计划吗？',
    approveSuccess: '已通过该学习计划',
    rejectConfirm: '确认驳回该学习计划吗？',
    rejectPrompt: '请输入驳回理由（可选）',
    rejectSuccess: '已驳回该学习计划'
  },
  analytics: {
    loading: '正在获取数据分析看板...',
    refreshSuccess: '数据分析看板已更新',
    loadFailed: '数据分析加载失败',
    noStudent: '请选择学生查看积分明细',
    studentLoading: '正在刷新学生积分明细...',
    studentEmpty: '近三个月暂无积分记录'
  }
};

const APPROVAL_TABS = {
  PENDING: 'pending',
  UNSUBMITTED: 'unsubmitted',
  COMPLETED: 'completed'
};

const PLAN_APPROVAL_TABS = {
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const PLAN_APPROVAL_STATUSES = [
  PLAN_APPROVAL_TABS.SUBMITTED,
  PLAN_APPROVAL_TABS.APPROVED,
  PLAN_APPROVAL_TABS.REJECTED
];

const DEFAULT_APPROVAL_TAB = APPROVAL_TABS.PENDING;
const CONFIG_VIEWS = new Set(['students', 'tasks', 'assignments', 'rewards', 'point-presets']);
const ADMIN_VIEWS = new Set(['analytics', 'plan-approvals', 'approvals', 'notifications']);

function normalizeAdminView(value) {
  if (!value) return 'analytics';
  const key = String(value).trim().toLowerCase();
  return ADMIN_VIEWS.has(key) ? key : 'analytics';
}

function readAdminViewFromSearch() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('view');
  return requested ? requested.trim().toLowerCase() : null;
}

function updateAdminLocation(view) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
}

const elements = {
  views: Array.from(document.querySelectorAll('.view')),
  navContainer: qs('.sidebar__nav'),
  navApprovals: qs('#navApprovals'),
  navPlanApprovals: qs('#navPlanApprovals'),
  navNotifications: qs('#navNotifications'),
  navAnalytics: qs('#navAnalytics'),
  logoutButton: qs('#logoutButton'),
  analytics: {
    message: qs('#analyticsMessage'),
    summary: qs('#analyticsSummary'),
    sourceFilters: qs('#analyticsSourceFilters'),
    rangeTabs: qs('#analyticsRangeTabs'),
    leaderboard: qs('#analyticsLeaderboard'),
    leaderboardMeta: qs('#analyticsLeaderboardMeta'),
    trendChart: qs('#analyticsTrendChart'),
    trendMeta: qs('#analyticsTrendMeta'),
    sourceBreakdown: qs('#analyticsSourceBreakdown'),
    refreshBtn: qs('#analyticsRefreshBtn'),
    studentSelect: qs('#analyticsStudentSelect'),
    studentRefreshBtn: qs('#analyticsStudentRefreshBtn'),
    studentSummary: qs('#analyticsStudentSummary'),
    studentHistory: qs('#analyticsStudentHistory')
  },
  approval: {
    message: qs('#approvalMessage'),
    tabs: qs('#approvalTabs'),
    tabButtons: qsa('#approvalTabs button'),
    list: qs('#approvalList'),
    refreshBtn: qs('#refreshApprovalsBtn'),
    dateLabel: qs('#approvalDateLabel')
  },
  planApproval: {
    message: qs('#planApprovalsMessage'),
    tabs: qs('#planApprovalsTabs'),
    tabButtons: qsa('#planApprovalsTabs button'),
    list: qs('#planApprovalsList'),
    refreshBtn: qs('#planApprovalsRefreshBtn')
  },
  notifications: {
    message: qs('#notificationsMessage'),
    list: qs('#notificationList'),
    markAllBtn: qs('#notificationsMarkAll')
  },
  avatar: {
    sidebar: qs('#sidebarAvatar'),
    topbar: qs('#topbarAvatar')
  },
  name: {
    sidebar: qs('#sidebarUserName'),
    topbar: qs('#topbarUserName')
  },
  topbar: {
    notificationsButton: qs('#notificationsButton'),
    notificationsBadge: qs('#notificationsBadge')
  },
  sidebarToggles: qsa('[data-section-toggle]')
};

function getNavButtons() {
  return elements.navContainer ? qsa('[data-view]', elements.navContainer) : [];
}

function highlightNav(view) {
  getNavButtons().forEach((button) => {
    if (button.dataset.view === view) {
      button.classList.add('nav-item--active');
      const section = button.closest('.sidebar-section');
      if (section) {
        section.classList.remove('is-collapsed');
        const toggle = section.querySelector('[data-section-toggle]');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'true');
        }
        const content = section.querySelector('.sidebar-section__content');
        if (content) {
          content.setAttribute('aria-hidden', 'false');
        }
      }
    } else {
      button.classList.remove('nav-item--active');
    }
  });
}

function showView(view) {
  setActiveView(view);
  highlightNav(view);
  elements.views.forEach((section) => {
    const visible = section.dataset.view === view;
    toggleHidden(section, !visible);
  });
}

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
  const badge = elements.topbar.notificationsBadge;
  if (!badge) return;
  const count = getNotificationsUnread();
  if (!count) {
    badge.hidden = true;
    return;
  }
  badge.hidden = false;
  badge.textContent = count > 99 ? '99+' : String(count);
}

function renderNotifications() {
  const container = elements.notifications.list;
  if (!container) return;

  const notifications = getNotifications() ?? [];
  if (!notifications.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>${TEXT.notifications.emptyTitle}</strong>
        <span>${TEXT.notifications.emptySubtitle}</span>
      </div>
    `;
    return;
  }

  container.innerHTML = notifications
    .map((notification) => {
      const isUnread = !notification.isRead;
      const createdLabel = formatNotificationTimestamp(notification.createdAt);
      const link = notification.linkUrl
        ? `<a class="notification-list__link" data-href="${escapeHtml(notification.linkUrl)}">查看详情</a>`
        : '';
      const body = notification.body ? `<p class="notification-list__body">${escapeHtml(notification.body)}</p>` : '';
      return `
        <li class="notification-list__item${isUnread ? ' notification-list__item--unread' : ''}" data-href="${escapeHtml(notification.linkUrl ?? '')}">
          <h3 class="notification-list__title">${escapeHtml(notification.title)}</h3>
          ${body}
          <div class="notification-list__meta">
            <span>${escapeHtml(createdLabel)}</span>
            <span>${link}</span>
          </div>
        </li>
      `;
    })
    .join('');

  container.querySelectorAll('.notification-list__link').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      const href = anchor.dataset.href;
      if (href) {
        window.location.href = href;
      }
    });
  });

  container.querySelectorAll('.notification-list__item').forEach((item) => {
    const href = item.dataset.href;
    if (!href) return;
    item.addEventListener('click', (event) => {
      if (event.target.closest('.notification-list__link')) {
        return;
      }
      window.location.href = href;
    });
  });
}

async function refreshUnreadNotifications() {
  try {
    const { total } = await fetchUnreadNotificationsCount();
    setNotificationsUnread(total ?? 0);
    updateNotificationBadge();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[notifications] failed to refresh unread count', error);
  }
}

async function loadNotifications({ silent = false, markRead = false } = {}) {
  if (!elements.notifications.list) return;

  if (!silent && elements.notifications.message) {
    setMessage(elements.notifications.message, TEXT.notifications.loading, 'info');
  }

  try {
    if (markRead) {
      await markAllNotificationsRead();
    }

    const { notifications = [] } = await fetchNotifications();
    setNotifications(notifications);
    renderNotifications();

    await refreshUnreadNotifications();

    updateNotificationBadge();
    if (!silent && elements.notifications.message) {
      setMessage(elements.notifications.message, '', '');
    }
  } catch (error) {
    if (elements.notifications.message) {
      setMessage(elements.notifications.message, error.message, 'error');
    }
  }
}

async function handleMarkAllNotifications(event) {
  if (event) {
    event.preventDefault();
  }
  try {
    if (elements.notifications.message) {
      setMessage(elements.notifications.message, TEXT.notifications.markAllSuccess, 'success');
    }
    await loadNotifications({ silent: true, markRead: true });
  } catch (error) {
    if (elements.notifications.message) {
      setMessage(elements.notifications.message, error.message, 'error');
    }
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



// ----- Analytics dashboard -----

const ANALYTICS_RANGES = ['today', 'week', 'month'];
const ANALYTICS_RANGE_LABELS = {
  today: '今日',
  week: '近 7 日',
  month: '近 30 日'
};

function renderAnalyticsSkeleton() {
  console.debug('[analytics] render skeleton');
  if (elements.analytics.summary) {
    elements.analytics.summary.innerHTML = [
      {
        title: '累计发放',
        note: '等待载入…'
      },
      {
        title: '手动调整净额',
        note: '等待载入…'
      },
      {
        title: '兑换消耗',
        note: '等待载入…'
      },
      {
        title: '活跃学生',
        note: '等待载入…'
      },
      {
        title: '日均发放',
        note: '等待载入…'
      }
    ]
      .map(
        (item) => `
      <article class="analytics-summary__card analytics-summary__card--loading">
        <span class="analytics-summary__title">${item.title}</span>
        <span class="analytics-summary__value">--</span>
        <span class="analytics-summary__note">${item.note}</span>
      </article>
    `
      )
      .join('');
  }
  if (elements.analytics.leaderboard) {
    elements.analytics.leaderboard.innerHTML =
      '<p class="analytics-leaderboard__empty">正在准备排行榜，请稍候…</p>';
  }
  if (elements.analytics.trendChart) {
    elements.analytics.trendChart.innerHTML =
      '<p class="analytics-leaderboard__empty">正在绘制积分趋势…</p>';
  }
  if (elements.analytics.sourceBreakdown) {
    elements.analytics.sourceBreakdown.innerHTML =
      '<p class="analytics-leaderboard__empty">正在统计积分来源…</p>';
  }
  if (elements.analytics.studentSummary) {
    elements.analytics.studentSummary.innerHTML =
      '<p class="analytics-history__empty">请选择学生查看积分流水。</p>';
  }
  if (elements.analytics.studentHistory) {
    elements.analytics.studentHistory.innerHTML =
      '<li class="analytics-history__empty">数据载入中…</li>';
  }
}

function renderAnalyticsErrorState(message) {
  console.debug('[analytics] render error state', message);
  const detail = message || '暂时无法加载数据分析内容，请稍后重试。';
  if (elements.analytics.summary) {
    elements.analytics.summary.innerHTML = `
      <article class="analytics-summary__card analytics-summary__card--error">
        <span class="analytics-summary__title">数据分析</span>
        <span class="analytics-summary__value">--</span>
        <span class="analytics-summary__note">${detail}</span>
      </article>
    `;
  }
  if (elements.analytics.leaderboard) {
    elements.analytics.leaderboard.innerHTML = `
      <p class="analytics-leaderboard__empty">${detail}</p>
    `;
  }
  if (elements.analytics.trendChart) {
    elements.analytics.trendChart.innerHTML = `
      <p class="analytics-leaderboard__empty">${detail}</p>
    `;
  }
  if (elements.analytics.sourceBreakdown) {
    elements.analytics.sourceBreakdown.innerHTML = `
      <p class="analytics-leaderboard__empty">${detail}</p>
    `;
  }
  if (elements.analytics.studentSummary) {
    elements.analytics.studentSummary.innerHTML = `
      <article class="analytics-summary__card analytics-summary__card--error">
        <span class="analytics-summary__title">学生明细</span>
        <span class="analytics-summary__note">${detail}</span>
      </article>
    `;
  }
  if (elements.analytics.studentHistory) {
    elements.analytics.studentHistory.innerHTML = `
      <li class="analytics-history__empty">${detail}</li>
    `;
  }
}

function ensureAnalyticsFilters() {
  const validKeys = SOURCE_GROUPS.map((group) => group.key);
  const current = getAnalyticsFilters();
  const groups =
    current?.groups?.filter((group) => validKeys.includes(group)) ?? [...validKeys];
  const normalizedGroups = groups.length > 0 ? groups : [...validKeys];
  const sources = deriveSourcesFromGroups(normalizedGroups);
  const next = { groups: normalizedGroups, sources };
  setAnalyticsFilters(next);
  return next;
}

function ensureAnalyticsRange() {
  const current = getAnalyticsRange();
  if (ANALYTICS_RANGES.includes(current)) {
    return current;
  }
  setAnalyticsRange('today');
  return 'today';
}

function renderAnalyticsFilters() {
  if (!elements.analytics.sourceFilters) return;
  const filters = ensureAnalyticsFilters();
  elements.analytics.sourceFilters.innerHTML = SOURCE_GROUPS.map((group) => {
    const active = filters.groups.includes(group.key);
    return `
      <label class="chip-checkbox ${active ? 'chip-checkbox--active' : ''}">
        <input type="checkbox" value="${group.key}" ${active ? 'checked' : ''} />
        <span>${group.label}</span>
      </label>
    `;
  }).join('');
}

function updateAnalyticsRangeTabs() {
  if (!elements.analytics.rangeTabs) return;
  const current = ensureAnalyticsRange();
  qsa('[data-range]', elements.analytics.rangeTabs).forEach((button) => {
    const isActive = button.dataset.range === current;
    button.classList.toggle('chip-button--active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function updateAnalyticsStudentOptions(students, activeId) {
  if (!elements.analytics.studentSelect) return;
  if (!Array.isArray(students) || students.length === 0) {
    elements.analytics.studentSelect.innerHTML = '<option value="">暂无学生</option>';
    return;
  }
  const placeholder = '<option value="">请选择学生</option>';
  const options = students
    .map((student) => {
      const label = student.displayName ?? student.loginName ?? `学生 ${student.id}`;
      const selected = Number(student.id) === Number(activeId) ? 'selected' : '';
      return `<option value="${student.id}" ${selected}>${label}</option>`;
    })
    .join('');
  elements.analytics.studentSelect.innerHTML = placeholder + options;
  if (activeId) {
    elements.analytics.studentSelect.value = String(activeId);
  }
}

function renderAnalyticsStudentSection(payload) {
  const filters = ensureAnalyticsFilters();
  const sources = filters.sources;
  if (!payload) {
    renderAnalyticsStudentSummary(elements.analytics.studentSummary, null, { sources });
    if (elements.analytics.studentHistory) {
      elements.analytics.studentHistory.innerHTML = `<li class="analytics-history__empty">${TEXT.analytics.noStudent}</li>`;
    }
    return;
  }
  renderAnalyticsStudentSummary(elements.analytics.studentSummary, payload, { sources });
  renderAnalyticsHistory(elements.analytics.studentHistory, payload.entries ?? [], {
    limit: 60
  });
}

function renderAnalyticsView() {
  const dashboard = getAnalyticsDashboard();
  console.debug('[analytics] render view with dashboard', dashboard);
  if (!dashboard) return;

  const filters = ensureAnalyticsFilters();
  const sources = filters.sources;

  renderAnalyticsFilters();
  updateAnalyticsRangeTabs();

  renderAnalyticsSummary(elements.analytics.summary, dashboard.summaryCards, dashboard.metadata);

  const rangeKey = ensureAnalyticsRange();
  const rangeLabel = ANALYTICS_RANGE_LABELS[rangeKey] ?? '最近';
  const rangeData = dashboard.ranges?.[rangeKey] ?? { leaderboard: [] };
  const leaderboardSummary = renderAnalyticsLeaderboard(
    elements.analytics.leaderboard,
    rangeData.leaderboard ?? [],
    { sources }
  );
  if (elements.analytics.leaderboardMeta) {
    elements.analytics.leaderboardMeta.textContent = `${rangeLabel} · 学生 ${leaderboardSummary.count} 人 · 净积分 ${leaderboardSummary.formattedTotal}`;
  }

  const trendSummary = renderAnalyticsTrend(
    elements.analytics.trendChart,
    dashboard.trend?.daily ?? [],
    { sources }
  );
  if (elements.analytics.trendMeta) {
    elements.analytics.trendMeta.textContent = `最近净积分 ${trendSummary.formattedLast} · 峰值 ${trendSummary.formattedPeakPositive}/${trendSummary.formattedPeakNegative}`;
  }

  renderAnalyticsSourceBreakdown(elements.analytics.sourceBreakdown, dashboard.sourceBreakdown, {
    sources
  });

  const selectedId = getAnalyticsStudentId();
  updateAnalyticsStudentOptions(dashboard.students ?? [], selectedId);

  const cachedHistory = getAnalyticsStudentHistory();
  if (cachedHistory && cachedHistory.studentId === selectedId) {
    renderAnalyticsStudentSection(cachedHistory.data);
  } else if (selectedId) {
    renderAnalyticsStudentSection(null);
  } else {
    renderAnalyticsStudentSection(null);
  }
}

async function loadAnalytics({ silent = false } = {}) {
  if (!elements.analytics.summary) return;
  ensureAnalyticsFilters();
  renderAnalyticsFilters();
  ensureAnalyticsRange();
  updateAnalyticsRangeTabs();
  if (!silent) {
    renderAnalyticsSkeleton();
    if (elements.analytics.message) {
      setMessage(elements.analytics.message, TEXT.analytics.loading, 'info');
    }
  }
  try {
    const dashboard = await fetchAnalyticsDashboard();
    console.debug('[analytics] dashboard payload', dashboard);
    if (!dashboard) {
      renderAnalyticsErrorState('未收到数据，请稍后再试。');
      if (elements.analytics.message) {
        setMessage(elements.analytics.message, '未收到数据，请稍后再试。', 'error');
      }
      return;
    }
    setAnalyticsDashboard(dashboard);
    ensureAnalyticsRange();

    let activeStudentId = getAnalyticsStudentId();
    if (!activeStudentId && dashboard.students?.length) {
      activeStudentId = dashboard.students[0].id;
      setAnalyticsStudentId(activeStudentId);
    } else if (
      activeStudentId &&
      Array.isArray(dashboard.students) &&
      !dashboard.students.some((student) => student.id === activeStudentId)
    ) {
      activeStudentId = dashboard.students[0]?.id ?? null;
      setAnalyticsStudentId(activeStudentId);
    }

    setAnalyticsStudentHistory(null);
    renderAnalyticsView();

    if (activeStudentId) {
      await loadAnalyticsStudentHistory({ silent: true, force: true });
    } else {
      renderAnalyticsStudentSection(null);
    }

    if (!silent && elements.analytics.message) {
      setMessage(elements.analytics.message, TEXT.analytics.refreshSuccess, 'success');
    }
  } catch (error) {
    const detail = error?.detail || error?.message || TEXT.analytics.loadFailed || '加载失败';
    if (elements.analytics.message) {
      setMessage(elements.analytics.message, detail, 'error');
    }
    if (!silent) {
      renderAnalyticsErrorState(detail);
    }
    console.error('[analytics] load failed', error);
  }
}

async function loadAnalyticsStudentHistory({ silent = false, force = false } = {}) {
  const studentId = getAnalyticsStudentId();
  if (!studentId) {
    setAnalyticsStudentHistory(null);
    renderAnalyticsStudentSection(null);
    if (!silent && elements.analytics.message) {
      setMessage(elements.analytics.message, TEXT.analytics.noStudent, 'info');
    }
    return;
  }

  const cached = getAnalyticsStudentHistory();
  if (!force && cached && cached.studentId === studentId) {
    renderAnalyticsStudentSection(cached.data);
    return;
  }

  try {
    if (!silent && elements.analytics.message) {
      setMessage(elements.analytics.message, TEXT.analytics.studentLoading, 'info');
    }
    const history = await fetchAnalyticsStudentHistory(studentId);
    setAnalyticsStudentHistory({ studentId, data: history });
    renderAnalyticsStudentSection(history);
    if (!silent && elements.analytics.message) {
      setMessage(elements.analytics.message, '', '');
    }
  } catch (error) {
    if (elements.analytics.message) {
      setMessage(elements.analytics.message, error.message, 'error');
    }
  }
}

function handleAnalyticsRangeClick(event) {
  const button = event.target.closest('[data-range]');
  if (!button || !elements.analytics.rangeTabs?.contains(button)) return;
  const range = button.dataset.range;
  if (!range || range === getAnalyticsRange()) {
    return;
  }
  setAnalyticsRange(range);
  updateAnalyticsRangeTabs();
  renderAnalyticsView();
  const cached = getAnalyticsStudentHistory();
  if (cached && cached.studentId === getAnalyticsStudentId()) {
    renderAnalyticsStudentSection(cached.data);
  }
}

function handleAnalyticsFilterChange(event) {
  const input = event.target;
  if (!input || input.type !== 'checkbox' || !elements.analytics.sourceFilters?.contains(input)) {
    return;
  }

  const filters = ensureAnalyticsFilters();
  const activeGroups = new Set(filters.groups);
  const groupKey = input.value;

  if (input.checked) {
    activeGroups.add(groupKey);
  } else {
    activeGroups.delete(groupKey);
    if (activeGroups.size === 0) {
      activeGroups.add(groupKey);
      input.checked = true;
      return;
    }
  }

  const groups = Array.from(activeGroups);
  const sources = deriveSourcesFromGroups(groups);
  setAnalyticsFilters({ groups, sources });
  renderAnalyticsFilters();
  renderAnalyticsView();

  const cached = getAnalyticsStudentHistory();
  if (cached && cached.studentId === getAnalyticsStudentId()) {
    renderAnalyticsStudentSection(cached.data);
  }
}

function handleAnalyticsStudentChange(event) {
  const value = event.target.value;
  if (!value) {
    setAnalyticsStudentId(null);
    setAnalyticsStudentHistory(null);
    renderAnalyticsStudentSection(null);
    return;
  }
  const studentId = Number.parseInt(value, 10);
  if (!Number.isInteger(studentId)) {
    setAnalyticsStudentId(null);
    setAnalyticsStudentHistory(null);
    renderAnalyticsStudentSection(null);
    return;
  }
  setAnalyticsStudentId(studentId);
  setAnalyticsStudentHistory(null);
  loadAnalyticsStudentHistory({ silent: false, force: true });
}

function handleAnalyticsRefresh() {
  loadAnalytics({ silent: false });
}

function handleAnalyticsStudentRefresh() {
  loadAnalyticsStudentHistory({ silent: false, force: true });
}

// ----- Approval helpers -----

function formatApprovalDateLabel(value) {
  if (!value) {
    return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function updateApprovalDateLabel(value) {
  if (!elements.approval.dateLabel) return;
  elements.approval.dateLabel.textContent = formatApprovalDateLabel(value || getApprovalsDate());
}

function normalizeApprovalTab(value) {
  if (value === APPROVAL_TABS.UNSUBMITTED) {
    return APPROVAL_TABS.UNSUBMITTED;
  }
  if (value === APPROVAL_TABS.COMPLETED) {
    return APPROVAL_TABS.COMPLETED;
  }
  return APPROVAL_TABS.PENDING;
}

function splitApprovals(entries = []) {
  const pending = [];
  const unsubmitted = [];
  const completed = [];

  entries.forEach((entry) => {
    if (!entry) return;
    const status = entry.status ?? 'pending';
    const reviewStatus = entry.reviewStatus ?? 'pending';
    if (reviewStatus === 'approved') {
      completed.push(entry);
    } else if (status === 'completed' && reviewStatus === 'pending') {
      pending.push(entry);
    } else {
      unsubmitted.push(entry);
    }
  });

  return { pending, unsubmitted, completed };
}

function renderApprovalTabs(split) {
  if (!elements.approval.tabButtons?.length) return;

  const activeTab = normalizeApprovalTab(getApprovalsTab());
  const counts = {
    [APPROVAL_TABS.PENDING]: split.pending.length,
    [APPROVAL_TABS.UNSUBMITTED]: split.unsubmitted.length,
    [APPROVAL_TABS.COMPLETED]: split.completed.length
  };

  elements.approval.tabButtons.forEach((button) => {
    const tabKey = normalizeApprovalTab(button.dataset.tab);
    const isActive = tabKey === activeTab;
    button.classList.toggle('chip-button--active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    const baseLabel =
      TEXT.approval.tabs?.[tabKey] || button.dataset.label || button.textContent.trim();
    button.dataset.label = baseLabel;
    const count = counts[tabKey] ?? 0;
    button.textContent = count > 0 ? `${baseLabel} (${count})` : baseLabel;
  });
}

function renderApprovals() {
  if (!elements.approval.list) return;
  const entries = getApprovals() ?? [];
  updateApprovalDateLabel();

  const split = splitApprovals(entries);
  renderApprovalTabs(split);

  const currentTab = getApprovalsTab();
  const activeTab = normalizeApprovalTab(currentTab ?? DEFAULT_APPROVAL_TAB);
  if (activeTab !== currentTab) {
    setApprovalsTab(activeTab);
  }

  let activeEntries = split.pending;
  let emptyTitle = TEXT.approval.emptyPendingTitle;
  let emptySubtitle = TEXT.approval.emptyPendingSubtitle;

  if (activeTab === APPROVAL_TABS.UNSUBMITTED) {
    activeEntries = split.unsubmitted;
    emptyTitle = TEXT.approval.emptyUnsubmittedTitle;
    emptySubtitle = TEXT.approval.emptyUnsubmittedSubtitle;
  } else if (activeTab === APPROVAL_TABS.COMPLETED) {
    activeEntries = split.completed;
    emptyTitle = TEXT.approval.emptyCompletedTitle;
    emptySubtitle = TEXT.approval.emptyCompletedSubtitle;
  }

  renderApprovalList(elements.approval.list, activeEntries, {
    onApprove: handleApproveEntry,
    onReject: handleRejectEntry,
    onDelete: handleDeleteEntry,
    onAward: handleAwardTask,
    emptyTitle,
    emptySubtitle
  });
  if (elements.approval.message) {
    setMessage(elements.approval.message, '', '');
  }
}

function handleApprovalTabClick(event) {
  const button = event.target.closest('[data-tab]');
  if (!button || !elements.approval.tabs?.contains(button)) {
    return;
  }
  const nextTab = normalizeApprovalTab(button.dataset.tab);
  const currentTab = normalizeApprovalTab(getApprovalsTab());
  if (nextTab === currentTab) {
    return;
  }
  setApprovalsTab(nextTab);
  renderApprovals();
}

function replaceApprovalEntry(entry) {
  const current = getApprovals();
  const next = current.map((item) => (item.id === entry.id ? entry : item));
  setApprovals(next);
  renderApprovals();
}

function removeApprovalEntry(entryId) {
  const current = getApprovals();
  const next = current.filter((item) => item.id !== entryId);
  setApprovals(next);
  renderApprovals();
}

async function loadApprovals({ silent } = {}) {
  if (!elements.approval.list) return;
  if (!silent && elements.approval.message) {
    setMessage(elements.approval.message, TEXT.approval.loading, 'info');
  }
  try {
    const { entries = [], date } = await fetchApprovalEntries();
    setApprovals(entries);
    setApprovalsDate(date || null);
    renderApprovals();
    await refreshUnreadNotifications();
    if (!silent && elements.approval.message) {
      setMessage(elements.approval.message, TEXT.approval.refreshSuccess, 'success');
    }
  } catch (error) {
    if (elements.approval.message) {
      setMessage(elements.approval.message, error.message, 'error');
    }
  }
}

async function handleApproveEntry(entryId, note) {
  if (!window.confirm(TEXT.approval.approveConfirm)) {
    return;
  }
  try {
    const trimmedNote = note?.trim();
    const payload = trimmedNote ? { note: trimmedNote } : {};
    const { entry } = await approveStudentEntry(entryId, payload);
    replaceApprovalEntry(entry);
    if (elements.approval.message) {
      setMessage(elements.approval.message, TEXT.approval.approveSuccess, 'success');
    }
  } catch (error) {
    if (elements.approval.message) {
      setMessage(elements.approval.message, error.message, 'error');
    }
  }
}

async function handleRejectEntry(entryId, note) {
  if (!window.confirm(TEXT.approval.rejectConfirm)) {
    return;
  }
  try {
    const trimmedNote = note?.trim();
    const payload = trimmedNote ? { note: trimmedNote } : {};
    const { entry } = await rejectStudentEntry(entryId, payload);
    replaceApprovalEntry(entry);
    if (elements.approval.message) {
      setMessage(elements.approval.message, TEXT.approval.rejectSuccess, 'success');
    }
  } catch (error) {
    if (elements.approval.message) {
      setMessage(elements.approval.message, error.message, 'error');
    }
  }
}

async function handleDeleteEntry(entryId) {
  if (!window.confirm(TEXT.approval.deleteConfirm)) {
    return;
  }
  try {
    await deleteApprovalEntry(entryId);
    removeApprovalEntry(entryId);
    if (elements.approval.message) {
      setMessage(elements.approval.message, TEXT.approval.deleteSuccess, 'success');
    }
  } catch (error) {
    if (elements.approval.message) {
      setMessage(elements.approval.message, error.message, 'error');
    }
  }
}

async function handleAwardTask(payload, button) {
  const taskId = Number.parseInt(payload?.taskId, 10);
  const studentId = Number.parseInt(payload?.studentId, 10);
  const entryDate = payload?.entryDate;

  if (!Number.isInteger(taskId) || !Number.isInteger(studentId) || !entryDate) {
    return;
  }

  const taskTitle = payload?.taskTitle || '';
  const studentName = payload?.studentName || '';
  const confirmMessage =
    typeof TEXT.approval.awardConfirm === 'function'
      ? TEXT.approval.awardConfirm(taskTitle, studentName)
      : TEXT.approval.awardConfirm;

  if (!window.confirm(confirmMessage)) {
    return;
  }

  if (button) {
    button.disabled = true;
  }

  try {
    if (elements.approval.message) {
      setMessage(elements.approval.message, TEXT.approval.awardInProgress, 'info');
    }
    await awardTaskPoints(taskId, { studentId, entryDate });
    if (elements.approval.message) {
      setMessage(elements.approval.message, TEXT.approval.awardSuccess, 'success');
    }
    await loadApprovals({ silent: true });
  } catch (error) {
    if (elements.approval.message) {
      setMessage(elements.approval.message, error.message, 'error');
    }
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

// ----- Plan approval helpers -----

function normalizePlanApprovalStatus(value) {
  if (value === PLAN_APPROVAL_TABS.APPROVED) {
    return PLAN_APPROVAL_TABS.APPROVED;
  }
  if (value === PLAN_APPROVAL_TABS.REJECTED) {
    return PLAN_APPROVAL_TABS.REJECTED;
  }
  return PLAN_APPROVAL_TABS.SUBMITTED;
}

function renderPlanApprovalTabs(counts = {}) {
  if (!elements.planApproval.tabButtons?.length) return;
  const activeStatus = normalizePlanApprovalStatus(getPlanApprovalsStatus());
  elements.planApproval.tabButtons.forEach((button) => {
    const status = normalizePlanApprovalStatus(button.dataset.status);
    const isActive = status === activeStatus;
    button.classList.toggle('chip-button--active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    const baseLabel = TEXT.planApproval.tabs?.[status] || button.dataset.label || button.textContent.trim();
    button.dataset.label = baseLabel;
    const count = counts[status] ?? 0;
    button.textContent = count > 0 ? `${baseLabel} (${count})` : baseLabel;
  });
}

function renderPlanApprovals(counts = null) {
  if (!elements.planApproval.list) return;
  const plans = getPlanApprovals() ?? [];
  const activeStatus = normalizePlanApprovalStatus(getPlanApprovalsStatus());

  const fallbackCounts = plans.reduce(
    (acc, plan) => {
      const status = normalizePlanApprovalStatus(plan.status);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {}
  );
  const resolvedCounts = counts || fallbackCounts;
  renderPlanApprovalTabs({
    submitted: resolvedCounts[PLAN_APPROVAL_TABS.SUBMITTED] ?? 0,
    approved: resolvedCounts[PLAN_APPROVAL_TABS.APPROVED] ?? 0,
    rejected: resolvedCounts[PLAN_APPROVAL_TABS.REJECTED] ?? 0
  });

  const activePlans = plans.filter(
    (plan) => normalizePlanApprovalStatus(plan.status) === activeStatus
  );
  const emptyState = TEXT.planApproval.empty?.[activeStatus];

  renderPlanApprovalList(elements.planApproval.list, activePlans, {
    onApprove: handleApprovePlan,
    onReject: handleRejectPlan,
    emptyState
  });

  if (elements.planApproval.message) {
    setMessage(elements.planApproval.message, '', '');
  }
}

async function loadPlanApprovals({ silent } = {}) {
  if (!elements.planApproval.list) return;
  const activeStatus = normalizePlanApprovalStatus(getPlanApprovalsStatus());
  if (!silent && elements.planApproval.message) {
    setMessage(elements.planApproval.message, TEXT.planApproval.loading, 'info');
  }
  try {
    const results = await Promise.all(
      PLAN_APPROVAL_STATUSES.map(async (status) => {
        const response = await fetchParentPlans({ status });
        return {
          status,
          plans: response?.plans ?? []
        };
      })
    );

    const counts = results.reduce(
      (acc, item) => ({
        ...acc,
        [item.status]: item.plans.length
      }),
      {}
    );

    const activeResult =
      results.find((item) => item.status === activeStatus) ?? { plans: [] };

    setPlanApprovals(activeResult.plans);
    renderPlanApprovals(counts);
  } catch (error) {
    if (elements.planApproval.message) {
      setMessage(
        elements.planApproval.message,
        error?.message || TEXT.planApproval.loadFailed,
        'error'
      );
    }
  }
}

function handlePlanApprovalTabClick(event) {
  const button = event.target.closest('[data-status]');
  if (!button || !elements.planApproval.tabs?.contains(button)) {
    return;
  }
  const nextStatus = normalizePlanApprovalStatus(button.dataset.status);
  if (nextStatus === getPlanApprovalsStatus()) {
    return;
  }
  setPlanApprovalsStatus(nextStatus);
  loadPlanApprovals({ silent: false });
}

async function handleApprovePlan(planId, awardPoints = 0) {
  if (!window.confirm(TEXT.planApproval.approveConfirm)) {
    return;
  }
  try {
    const sanitizedPoints = Number.isInteger(awardPoints) && awardPoints > 0 ? awardPoints : 0;
    const payload = sanitizedPoints > 0 ? { points: sanitizedPoints } : undefined;
    await approveParentPlan(planId, payload);
    await loadPlanApprovals({ silent: true });
    if (elements.planApproval.message) {
      setMessage(elements.planApproval.message, TEXT.planApproval.approveSuccess, 'success');
    }
  } catch (error) {
    if (elements.planApproval.message) {
      setMessage(elements.planApproval.message, error.message, 'error');
    }
  }
}

async function handleRejectPlan(planId) {
  if (!window.confirm(TEXT.planApproval.rejectConfirm)) {
    return;
  }
  const reason = window.prompt(TEXT.planApproval.rejectPrompt, '')?.trim();
  try {
    const payload = reason ? { reason } : {};
    await rejectParentPlan(planId, payload);
    await loadPlanApprovals({ silent: true });
    if (elements.planApproval.message) {
      setMessage(elements.planApproval.message, TEXT.planApproval.rejectSuccess, 'success');
    }
  } catch (error) {
    if (elements.planApproval.message) {
      setMessage(elements.planApproval.message, error.message, 'error');
    }
  }
}


// ----- Navigation & lifecycle -----

async function changeView(view) {
  if (!view) return;
  if (view === 'points-bonus') {
    window.location.href = '/points-bonus.html';
    return;
  }
  if (view === 'points-penalty') {
    window.location.href = '/points-penalty.html';
    return;
  }
  if (view === 'redeem') {
    window.location.href = '/points-redeem.html';
    return;
  }
  if (CONFIG_VIEWS.has(view)) {
    window.location.href = `/config.html?view=${view}`;
    return;
  }
  const nextView = normalizeAdminView(view);
  if (nextView === getActiveView()) {
    updateAdminLocation(nextView);
    return;
  }
  console.debug('[admin] changeView ->', nextView);
  showView(nextView);
  updateAdminLocation(nextView);
  if (nextView === 'plan-approvals') {
    await loadPlanApprovals({ silent: true });
  } else if (nextView === 'approvals') {
    await loadApprovals({ silent: true });
  } else if (nextView === 'notifications') {
    await loadNotifications({ silent: false, markRead: true });
  } else if (nextView === 'analytics') {
    await loadAnalytics({ silent: false });
  }
}

function setupNavigation() {
  if (elements.navContainer) {
    elements.navContainer.addEventListener('click', (event) => {
      const sectionToggle = event.target.closest('[data-section-toggle]');
      if (sectionToggle) {
        toggleSidebarSection(sectionToggle);
        return;
      }
      const external = event.target.closest('[data-link]');
      if (external) {
        event.preventDefault();
        const targetUrl = external.dataset.link;
        if (targetUrl) {
          window.location.href = targetUrl;
        }
        return;
      }
      const target = event.target.closest('[data-view]');
      if (!target || target.disabled) return;
      console.debug('[admin] nav click', target.dataset.view);
      changeView(target.dataset.view);
    });
  }

  if (elements.navPlanApprovals) {
    elements.navPlanApprovals.addEventListener('click', () => changeView('plan-approvals'));
  }
  if (elements.navApprovals) {
    elements.navApprovals.addEventListener('click', () => changeView('approvals'));
  }
  if (elements.navAnalytics) {
    elements.navAnalytics.addEventListener('click', () => changeView('analytics'));
  }
  if (elements.navNotifications) {
    elements.navNotifications.addEventListener('click', () => changeView('notifications'));
  }
  if (elements.topbar.notificationsButton) {
    elements.topbar.notificationsButton.addEventListener('click', (event) => {
      event.preventDefault();
      changeView('notifications');
    });
  }

  elements.sidebarToggles.forEach((button) => {
    const contentId = button.getAttribute('aria-controls');
    const content = contentId ? document.getElementById(contentId) : null;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    if (content) {
      content.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    }
    const section = button.closest('.sidebar-section');
    if (section) {
      section.classList.toggle('is-collapsed', !expanded);
    }
  });
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

    const requestedView = readAdminViewFromSearch();
    if (requestedView && CONFIG_VIEWS.has(requestedView)) {
      window.location.href = `/config.html?view=${requestedView}`;
      return;
    }
    let initialView = requestedView ? normalizeAdminView(requestedView) : normalizeAdminView(getActiveView());
    if (requestedView === 'points') {
      window.location.href = '/points-bonus.html';
      return;
    }
    if (requestedView === 'redeem') {
      window.location.href = '/points-redeem.html';
      return;
    }
    setActiveView(initialView);
    showView(initialView);
    updateAdminLocation(initialView);
    if (initialView === 'plan-approvals') {
      await loadPlanApprovals({ silent: true });
    } else if (initialView === 'approvals') {
      await loadApprovals({ silent: true });
    } else if (initialView === 'notifications') {
      await loadNotifications({ silent: false, markRead: true });
    } else if (initialView === 'analytics') {
      await loadAnalytics({ silent: false });
    } else {
      await loadAnalytics({ silent: false });
    }
  } catch (error) {
    window.location.href = '/';
  }
}

function main() {
  if (elements.notifications.markAllBtn) {
    elements.notifications.markAllBtn.addEventListener('click', handleMarkAllNotifications);
  }
  if (elements.analytics.rangeTabs) {
    elements.analytics.rangeTabs.addEventListener('click', handleAnalyticsRangeClick);
  }
  if (elements.analytics.sourceFilters) {
    elements.analytics.sourceFilters.addEventListener('change', handleAnalyticsFilterChange);
  }
  if (elements.analytics.refreshBtn) {
    elements.analytics.refreshBtn.addEventListener('click', handleAnalyticsRefresh);
  }
  if (elements.analytics.studentSelect) {
    elements.analytics.studentSelect.addEventListener('change', handleAnalyticsStudentChange);
  }
  if (elements.analytics.studentRefreshBtn) {
    elements.analytics.studentRefreshBtn.addEventListener('click', handleAnalyticsStudentRefresh);
  }
  if (elements.logoutButton) {
    elements.logoutButton.addEventListener('click', handleLogout);
  }
  if (elements.approval.refreshBtn) {
    elements.approval.refreshBtn.addEventListener('click', () => loadApprovals({ silent: false }));
  }
  if (elements.approval.tabs) {
    elements.approval.tabs.addEventListener('click', handleApprovalTabClick);
  }
  if (elements.planApproval.refreshBtn) {
    elements.planApproval.refreshBtn.addEventListener('click', () =>
      loadPlanApprovals({ silent: false })
    );
  }
  if (elements.planApproval.tabs) {
    elements.planApproval.tabs.addEventListener('click', handlePlanApprovalTabClick);
  }

  setupNavigation();
  bootstrap();
}
document.addEventListener('DOMContentLoaded', main);
