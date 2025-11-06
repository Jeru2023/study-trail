import { renderParentSidebar } from '../components/side_bar_parent.js';
import {
  getCurrentUser,
  fetchPointStudents,
  fetchStudentPointHistory,
  redeemStudentReward,
  fetchRewards,
  fetchUnreadNotificationsCount,
  logout
} from '../modules/apiClient.js';
import { qs, setMessage, disableForm } from '../modules/dom.js';
import {
  setUser,
  setNotificationsUnread,
  getNotificationsUnread,
  setRedeemStudents,
  getRedeemStudents,
  setActiveRedeemStudentId,
  getActiveRedeemStudentId,
  setRedeemHistory,
  getRedeemHistory,
  setRewards,
  getRewards
} from './state.js';
import { renderPointsStudentList, renderPointsHistory } from './points.js';

const CONFIG_VIEWS = new Set(['students', 'tasks', 'assignments', 'rewards', 'point-presets']);
const ADMIN_VIEWS = new Set(['analytics', 'plan-approvals', 'approvals', 'notifications']);
const POINT_PAGE_PATHS = {
  bonus: '/points-bonus.html',
  penalty: '/points-penalty.html',
  redeem: '/points-redeem.html'
};

const sidebarRoot = qs('[data-component="parent-sidebar"]');
renderParentSidebar(sidebarRoot, { activeKey: 'points:redeem' });

const TEXT = {
  loading: '正在加载积分数据...',
  refreshSuccess: '兑换信息已刷新',
  historyRefreshSuccess: '积分记录已更新',
  redeemSuccess: '兑换成功，已扣除相应积分',
  redeemInProgress: '正在提交兑换...',
  selectStudent: '请先选择学生账号',
  noRewards: '暂无可兑换的奖励，请先在积分商城中新增'
};

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
  message: qs('#redeemMessage'),
  refreshBtn: qs('#redeemRefreshBtn'),
  historyRefreshBtn: qs('#redeemHistoryRefreshBtn'),
  studentList: qs('#redeemStudentList'),
  detail: qs('#redeemDetail'),
  detailContent: qs('#redeemDetailContent'),
  emptyHint: qs('#redeemEmptyHint'),
  studentName: qs('#redeemStudentName'),
  studentLogin: qs('#redeemStudentLogin'),
  studentUpdated: qs('#redeemStudentUpdated'),
  studentBalance: qs('#redeemStudentBalance'),
  form: qs('#redeemForm'),
  formMessage: qs('#redeemFormMessage'),
  historyList: qs('#redeemHistoryList')
};

function formatPointsDateLabel(value) {
  if (!value) return '';
  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
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

function updateNotificationBadge() {
  if (!elements.notificationsBadge) return;
  const count = getNotificationsUnread();
  if (!count) {
    elements.notificationsBadge.hidden = true;
    return;
  }
  elements.notificationsBadge.hidden = false;
  elements.notificationsBadge.textContent = count > 99 ? '99+' : String(count);
}

async function refreshUnreadNotifications() {
  try {
    const { total } = await fetchUnreadNotificationsCount();
    setNotificationsUnread(total ?? 0);
    updateNotificationBadge();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[redeem] failed to refresh unread notifications', error);
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

function setHistoryPlaceholder(listElement) {
  if (!listElement) return;
  listElement.innerHTML =
    '<li class="points-history__item"><p class="points-history__item-note">暂无积分记录。</p></li>';
}

function resetRedeemDetail() {
  if (!elements.detail) return;
  elements.detail.dataset.empty = 'true';
  if (elements.detailContent) {
    elements.detailContent.hidden = true;
  }
  if (elements.studentName) elements.studentName.textContent = '学生姓名';
  if (elements.studentLogin) elements.studentLogin.textContent = '';
  if (elements.studentUpdated) elements.studentUpdated.textContent = '';
  if (elements.studentBalance) elements.studentBalance.textContent = '0';
  if (elements.form) {
    elements.form.reset();
    setMessage(elements.formMessage, '', '');
  }
  setHistoryPlaceholder(elements.historyList);
  populateRedeemRewardsSelect();
}

function populateRedeemDetail(student) {
  if (!elements.detail) return;
  if (!student) {
    resetRedeemDetail();
    return;
  }

  elements.detail.dataset.empty = 'false';
  if (elements.detailContent) {
    elements.detailContent.hidden = false;
  }

  const displayName = student.displayName || student.loginName;
  if (elements.studentName) elements.studentName.textContent = displayName;
  if (elements.studentLogin) {
    elements.studentLogin.textContent = `登录名：${student.loginName}`;
  }
  if (elements.studentUpdated) {
    const fallback = student.updatedAt || '';
    const last = student.lastActivityAt || fallback;
    elements.studentUpdated.textContent = last
      ? `最近更新：${formatPointsDateLabel(last)}`
      : '暂无积分记录';
  }
  if (elements.studentBalance) {
    elements.studentBalance.textContent = student.pointsBalance;
  }
  if (elements.form) {
    elements.form.reset();
    setMessage(elements.formMessage, '', '');
  }
  populateRedeemRewardsSelect();
}

function populateRedeemRewardsSelect() {
  if (!elements.form) return;
  const select = elements.form.elements?.rewardId;
  if (!select) return;

  const rewards = getRewards() || [];
  const activeRewards = rewards.filter(
    (reward) => reward.isActive && (reward.stock === null || reward.stock > 0)
  );
  const previousValue = select.value;

  select.innerHTML =
    '<option value="">请选择奖励</option>' +
    activeRewards
      .map((reward) => {
        const stockLabel =
          reward.stock === null || reward.stock === undefined
            ? '不限量'
            : `剩余 ${reward.stock}`;
        return `<option value="${reward.id}">${reward.title} · ${reward.pointsCost} 积分 · ${stockLabel}</option>`;
      })
      .join('');

  if (!activeRewards.length) {
    select.disabled = true;
  } else {
    select.disabled = false;
    if (previousValue && activeRewards.some((reward) => String(reward.id) === previousValue)) {
      select.value = previousValue;
    }
  }
}

async function refreshRedeemRewards({ silent = false } = {}) {
  if (!elements.form) return;
  try {
    const { rewards } = await fetchRewards();
    setRewards(rewards ?? []);
    populateRedeemRewardsSelect();
  } catch (error) {
    populateRedeemRewardsSelect();
    if (!silent && elements.message) {
      setMessage(elements.message, error.message, 'error');
    }
  }
}

async function loadRedeemHistory(studentId, { silent = false } = {}) {
  if (!studentId) {
    setRedeemHistory([]);
    setHistoryPlaceholder(elements.historyList);
    return;
  }
  try {
    const { entries } = await fetchStudentPointHistory(studentId);
    setRedeemHistory(entries ?? []);
    renderPointsHistory(elements.historyList, getRedeemHistory());
    if (!silent && elements.message) {
      setMessage(elements.message, TEXT.historyRefreshSuccess, 'success');
    }
  } catch (error) {
    if (elements.message) {
      setMessage(elements.message, error.message, 'error');
    }
  }
}

async function loadRedeemStudents({ silent = false, preserveSelection = false } = {}) {
  if (!elements.studentList) return;
  try {
    if (!silent && elements.message) {
      setMessage(elements.message, TEXT.loading, 'info');
    }

    const { students } = await fetchPointStudents();
    const list = students ?? [];
    setRedeemStudents(list);

    const previousId = preserveSelection ? getActiveRedeemStudentId() : null;
    let activeId = previousId;
    if (!activeId && list.length) {
      activeId = list[0].id;
    } else if (activeId && !list.some((student) => student.id === activeId)) {
      activeId = list.length ? list[0].id : null;
    }

    setActiveRedeemStudentId(activeId ?? null);
    renderPointsStudentList(elements.studentList, list, activeId ?? null);

    await refreshRedeemRewards({ silent: true });

    if (activeId) {
      const current = list.find((student) => student.id === activeId);
      populateRedeemDetail(current);
      await loadRedeemHistory(activeId, { silent: true });
    } else {
      resetRedeemDetail();
      setRedeemHistory([]);
      setHistoryPlaceholder(elements.historyList);
    }

    if (!silent && elements.message) {
      setMessage(elements.message, TEXT.refreshSuccess, 'success');
    }
  } catch (error) {
    if (elements.message) {
      setMessage(elements.message, error.message, 'error');
    }
    resetRedeemDetail();
    setRedeemStudents([]);
    setRedeemHistory([]);
    setActiveRedeemStudentId(null);
    setHistoryPlaceholder(elements.historyList);
  }
}

function handleRedeemStudentClick(event) {
  const card = event.target.closest('.points-student');
  if (!card) return;
  const studentId = Number.parseInt(card.dataset.studentId, 10);
  if (Number.isNaN(studentId) || studentId === getActiveRedeemStudentId()) {
    return;
  }
  setActiveRedeemStudentId(studentId);
  renderPointsStudentList(elements.studentList, getRedeemStudents(), studentId);
  const current = getRedeemStudents().find((student) => student.id === studentId);
  populateRedeemDetail(current);
  loadRedeemHistory(studentId, { silent: true });
}

async function submitRedeemForm(event) {
  event.preventDefault();
  if (!elements.form) return;

  const studentId = getActiveRedeemStudentId();
  if (!studentId) {
    setMessage(elements.formMessage, TEXT.selectStudent, 'error');
    return;
  }

  const formData = new FormData(elements.form);
  const rewardId = Number.parseInt(formData.get('rewardId'), 10);
  if (!Number.isInteger(rewardId)) {
    setMessage(elements.formMessage, TEXT.noRewards, 'error');
    return;
  }

  const quantityValue = Number.parseInt(formData.get('quantity'), 10);
  const quantity = Number.isInteger(quantityValue) && quantityValue > 0 ? quantityValue : 1;
  const note = formData.get('note')?.trim();

  try {
    disableForm(elements.form, true);
    setMessage(elements.formMessage, TEXT.redeemInProgress, 'info');
    await redeemStudentReward(studentId, {
      rewardId,
      quantity,
      ...(note ? { note } : {})
    });
    setMessage(elements.formMessage, TEXT.redeemSuccess, 'success');
    elements.form.reset();
    await loadRedeemStudents({ silent: true, preserveSelection: true });
  } catch (error) {
    setMessage(elements.formMessage, error.message, 'error');
  } finally {
    disableForm(elements.form, false);
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
      const viewTarget = event.target.closest('[data-view]');
      if (viewTarget) {
        event.preventDefault();
        const { view } = viewTarget.dataset;
        if (!view) return;
        if (CONFIG_VIEWS.has(view)) {
          window.location.href = `/config.html?view=${view}`;
          return;
        }
        if (ADMIN_VIEWS.has(view)) {
          window.location.href = `/admin.html?view=${view}`;
          return;
        }
        if (view === 'points-bonus') {
          window.location.href = POINT_PAGE_PATHS.bonus;
          return;
        }
        if (view === 'points-penalty') {
          window.location.href = POINT_PAGE_PATHS.penalty;
          return;
        }
        if (view === 'redeem') {
          window.location.href = POINT_PAGE_PATHS.redeem;
          return;
        }
      }
      const link = event.target.closest('[data-link]');
      if (link) {
        event.preventDefault();
        const href = link.dataset.link;
        if (href) {
          window.location.href = href;
        }
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

async function initialize() {
  try {
    const { user } = await getCurrentUser();
    if (!user || user.role !== 'parent') {
      window.location.href = '/';
      return;
    }
    setUser(user);
    updateUserDisplay(user);
    await refreshUnreadNotifications();
    await loadRedeemStudents({ silent: false });
  } catch (error) {
    window.location.href = '/';
  }
}

function main() {
  setupNavigation();
  if (elements.studentList) {
    elements.studentList.addEventListener('click', handleRedeemStudentClick);
  }
  if (elements.form) {
    elements.form.addEventListener('submit', submitRedeemForm);
  }
  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', () => loadRedeemStudents({ silent: false }));
  }
  if (elements.historyRefreshBtn) {
    elements.historyRefreshBtn.addEventListener('click', () => {
      const studentId = getActiveRedeemStudentId();
      if (!studentId) {
        setMessage(elements.message, TEXT.selectStudent, 'info');
        return;
      }
      loadRedeemHistory(studentId, { silent: false });
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

  initialize();
}

document.addEventListener('DOMContentLoaded', main);
