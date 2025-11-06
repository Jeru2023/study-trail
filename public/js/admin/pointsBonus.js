import { renderParentSidebar } from '../components/side_bar_parent.js';
import {
  getCurrentUser,
  fetchPointStudents,
  fetchStudentPointHistory,
  adjustStudentPoints,
  fetchQuickAdjustItems,
  fetchUnreadNotificationsCount,
  logout
} from '../modules/apiClient.js';
import { qs, setMessage, disableForm } from '../modules/dom.js';
import {
  setUser,
  setNotificationsUnread,
  getNotificationsUnread,
  setPointsStudents,
  getPointsStudents,
  setActivePointsStudentId,
  getActivePointsStudentId,
  setPointsHistory,
  getPointsHistory,
  setPointPresets,
  getPointPresets
} from './state.js';
import { renderPointsStudentList, renderPointsHistory } from './points.js';

const CONFIG_VIEWS = new Set(['students', 'tasks', 'assignments', 'rewards', 'point-presets']);
const ADMIN_VIEWS = new Set(['analytics', 'plan-approvals', 'approvals', 'notifications']);
const POINT_PAGE_PATHS = {
  bonus: '/points-bonus.html',
  penalty: '/points-penalty.html',
  redeem: '/points-redeem.html'
};

const PAGE_DIRECTION = 'bonus';

const TEXT = {
  loadingStudents: '正在加载积分数据...',
  refreshSuccess: '积分信息已刷新',
  historyRefreshSuccess: '积分记录已更新',
  adjustSuccess: '加分成功，积分已更新',
  adjustInProgress: '正在提交加分...',
  adjustInvalid: '请输入大于 0 的整数积分',
  selectStudent: '请先选择学生账号',
  presetsLoading: '正在加载加分模版...',
  presetHint: '从奖惩模版选择常用加分项目，一键完成奖励。',
  presetsEmpty: '还没有加分模版，请先前往配置中心添加。',
  presetApplyInProgress: (name) => `正在应用模版「${name}」...`,
  presetApplySuccess: (name, points) => `已奖励 ${points} 分（模版：${name}）。`
};

const sidebarRoot = qs('[data-component="parent-sidebar"]');
renderParentSidebar(sidebarRoot, { activeKey: 'points:bonus' });

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
  message: qs('#pointsMessage'),
  refreshBtn: qs('#pointsRefreshBtn'),
  historyRefreshBtn: qs('#pointsHistoryRefreshBtn'),
  studentList: qs('#pointsStudentList'),
  detail: qs('#pointsDetail'),
  detailContent: qs('#pointsDetailContent'),
  emptyHint: qs('#pointsEmptyHint'),
  studentName: qs('#pointsStudentName'),
  studentLogin: qs('#pointsStudentLogin'),
  studentUpdated: qs('#pointsStudentUpdated'),
  studentBalance: qs('#pointsStudentBalance'),
  presetList: qs('#pointsPresetList'),
  presetHint: qs('#pointsPresetHint'),
  adjustForm: qs('#pointsAdjustForm'),
  adjustMessage: qs('#pointsAdjustMessage'),
  historyList: qs('#pointsHistoryList')
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
    console.error('[points-bonus] failed to refresh unread notifications', error);
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

function resetPointsDetail() {
  if (!elements.detail) return;
  elements.detail.dataset.empty = 'true';
  if (elements.detailContent) {
    elements.detailContent.hidden = true;
  }
  if (elements.studentName) elements.studentName.textContent = '学生姓名';
  if (elements.studentLogin) elements.studentLogin.textContent = '';
  if (elements.studentUpdated) elements.studentUpdated.textContent = '';
  if (elements.studentBalance) elements.studentBalance.textContent = '0';
  if (elements.adjustForm) {
    elements.adjustForm.reset();
    setMessage(elements.adjustMessage, '', '');
  }
  setHistoryPlaceholder(elements.historyList);
}

function populatePointsDetail(student) {
  if (!elements.detail) return;
  if (!student) {
    resetPointsDetail();
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
  if (elements.adjustForm) {
    elements.adjustForm.reset();
  }
  setMessage(elements.adjustMessage, '', '');
}

async function loadPointsHistory(studentId, { silent = false } = {}) {
  if (!studentId) {
    setPointsHistory([]);
    setHistoryPlaceholder(elements.historyList);
    return;
  }
  try {
    const { entries } = await fetchStudentPointHistory(studentId);
    setPointsHistory(entries ?? []);
    renderPointsHistory(elements.historyList, getPointsHistory());
    if (!silent && elements.message) {
      setMessage(elements.message, TEXT.historyRefreshSuccess, 'success');
    }
  } catch (error) {
    if (elements.message) {
      setMessage(elements.message, error.message, 'error');
    }
  }
}

function normalizePreset(item) {
  const rawDirection = item.direction === 'penalty' ? 'penalty' : 'bonus';
  const points = Math.abs(Number.parseInt(item.points, 10) || 0);
  return {
    ...item,
    direction: rawDirection,
    points
  };
}

function renderPresetButtons(presets) {
  if (!elements.presetList) return;
  elements.presetList.innerHTML = '';

  if (!presets.length) {
    elements.presetList.innerHTML = '<span class="points-preset__empty">暂无加分模版</span>';
    return;
  }

  presets.forEach((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip-button';
    button.dataset.presetId = String(preset.id);
    button.textContent = `${preset.name || '未命名'} (+${preset.points})`;
    button.addEventListener('click', () => handlePresetApply(preset.id));
    elements.presetList.appendChild(button);
  });
}

async function loadPointPresets({ silent = false } = {}) {
  if (!elements.presetList) return;
  try {
    if (!silent && elements.message) {
      setMessage(elements.message, TEXT.presetsLoading, 'info');
    }
    const { presets } = await fetchQuickAdjustItems();
    const normalized = (presets ?? []).map(normalizePreset);
    setPointPresets(normalized);
    const bonusPresets = normalized.filter((preset) => preset.direction === PAGE_DIRECTION);
    renderPresetButtons(bonusPresets);
    if (elements.presetHint) {
      elements.presetHint.textContent = bonusPresets.length
        ? TEXT.presetHint
        : TEXT.presetsEmpty;
    }
    if (!silent && elements.message) {
      setMessage(elements.message, '', '');
    }
  } catch (error) {
    if (elements.presetHint) {
      elements.presetHint.textContent = TEXT.presetsEmpty;
    }
    if (elements.message) {
      setMessage(elements.message, error.message, 'error');
    }
  }
}

async function loadPointStudents({ silent = false, preserveSelection = false } = {}) {
  if (!elements.studentList) return;
  try {
    if (!silent && elements.message) {
      setMessage(elements.message, TEXT.loadingStudents, 'info');
    }
    const { students } = await fetchPointStudents();
    const list = students ?? [];
    setPointsStudents(list);

    const previousId = preserveSelection ? getActivePointsStudentId() : null;
    let activeId = previousId;
    if (!activeId && list.length) {
      activeId = list[0].id;
    } else if (activeId && !list.some((student) => student.id === activeId)) {
      activeId = list.length ? list[0].id : null;
    }

    setActivePointsStudentId(activeId ?? null);
    renderPointsStudentList(elements.studentList, list, activeId ?? null);

    if (activeId) {
      const current = list.find((student) => student.id === activeId);
      populatePointsDetail(current);
      await loadPointsHistory(activeId, { silent: true });
    } else {
      resetPointsDetail();
      setPointsHistory([]);
      setHistoryPlaceholder(elements.historyList);
    }

    if (!silent && elements.message) {
      setMessage(elements.message, TEXT.refreshSuccess, 'success');
    }
  } catch (error) {
    if (elements.message) {
      setMessage(elements.message, error.message, 'error');
    }
    resetPointsDetail();
    setPointsStudents([]);
    setPointsHistory([]);
    setActivePointsStudentId(null);
    setHistoryPlaceholder(elements.historyList);
  }
}

function handlePointsStudentClick(event) {
  const card = event.target.closest('.points-student');
  if (!card) return;
  const studentId = Number.parseInt(card.dataset.studentId, 10);
  if (Number.isNaN(studentId) || studentId === getActivePointsStudentId()) {
    return;
  }
  setActivePointsStudentId(studentId);
  renderPointsStudentList(elements.studentList, getPointsStudents(), studentId);
  const current = getPointsStudents().find((student) => student.id === studentId);
  populatePointsDetail(current);
  loadPointsHistory(studentId, { silent: true });
}

async function handlePresetApply(presetId) {
  const studentId = getActivePointsStudentId();
  if (!studentId) {
    setMessage(elements.message, TEXT.selectStudent, 'error');
    return;
  }
  const preset = getPointPresets().find((item) => item.id === presetId);
  if (!preset || preset.direction !== PAGE_DIRECTION) {
    setMessage(elements.message, '该模版不可用，请刷新后重试。', 'error');
    return;
  }

  const delta = preset.points;
  const note = preset.name || preset.title || '';

  try {
    setMessage(elements.message, TEXT.presetApplyInProgress(note || '该模版'), 'info');
    await adjustStudentPoints(studentId, note ? { delta, note } : { delta });
    setMessage(elements.message, TEXT.presetApplySuccess(note || '该模版', delta), 'success');
    await loadPointStudents({ silent: true, preserveSelection: true });
    await loadPointsHistory(studentId, { silent: true });
  } catch (error) {
    setMessage(elements.message, error.message, 'error');
  }
}

async function submitPointsAdjust(event) {
  event.preventDefault();
  if (!elements.adjustForm) return;
  const studentId = getActivePointsStudentId();
  if (!studentId) {
    setMessage(elements.adjustMessage, TEXT.selectStudent, 'error');
    return;
  }

  const formData = new FormData(elements.adjustForm);
  const deltaValue = Number.parseInt(formData.get('delta'), 10);
  const note = formData.get('note')?.trim();
  const normalizedDelta = Math.abs(Number.isInteger(deltaValue) ? deltaValue : 0);

  if (!Number.isInteger(deltaValue) || normalizedDelta <= 0) {
    setMessage(elements.adjustMessage, TEXT.adjustInvalid, 'error');
    return;
  }

  try {
    disableForm(elements.adjustForm, true);
    setMessage(elements.adjustMessage, TEXT.adjustInProgress, 'info');
    const payload = note ? { delta: normalizedDelta, note } : { delta: normalizedDelta };
    await adjustStudentPoints(studentId, payload);
    setMessage(elements.adjustMessage, TEXT.adjustSuccess, 'success');
    elements.adjustForm.reset();
    await loadPointStudents({ silent: true, preserveSelection: true });
    await loadPointsHistory(studentId, { silent: true });
  } catch (error) {
    setMessage(elements.adjustMessage, error.message, 'error');
  } finally {
    disableForm(elements.adjustForm, false);
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
    await Promise.all([refreshUnreadNotifications(), loadPointPresets({ silent: false })]);
    await loadPointStudents({ silent: false });
  } catch (error) {
    window.location.href = '/';
  }
}

function main() {
  setupNavigation();
  if (elements.studentList) {
    elements.studentList.addEventListener('click', handlePointsStudentClick);
  }
  if (elements.adjustForm) {
    elements.adjustForm.addEventListener('submit', submitPointsAdjust);
  }
  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', async () => {
      try {
        await loadPointPresets({ silent: true });
        await loadPointStudents({ silent: false });
      } catch (error) {
        if (elements.message) {
          setMessage(elements.message, error.message, 'error');
        }
      }
    });
  }
  if (elements.historyRefreshBtn) {
    elements.historyRefreshBtn.addEventListener('click', () => {
      const activeId = getActivePointsStudentId();
      loadPointsHistory(activeId, { silent: false });
    });
  }
  if (elements.logoutButton) {
    elements.logoutButton.addEventListener('click', handleLogout);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshUnreadNotifications();
      loadPointPresets({ silent: true });
    }
  });
  initialize();
}

document.addEventListener('DOMContentLoaded', main);
