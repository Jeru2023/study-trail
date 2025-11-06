import { renderParentSidebar } from '../components/side_bar_parent.js';
import {
  getCurrentUser,
  fetchTasks,
  createTask,
  updateTask,
  removeTask,
  fetchStudents,
  createStudent,
  updateStudent,
  removeStudent,
  fetchAssignments,
  saveAssignments,
  removeAssignments,
  fetchRewards,
  createReward,
  updateReward,
  deleteReward,
  fetchQuickAdjustItems,
  createQuickAdjustItem,
  updateQuickAdjustItem,
  deleteQuickAdjustItem,
  fetchUnreadNotificationsCount,
  logout
} from '../modules/apiClient.js';
import { qs, qsa, setMessage, disableForm, toggleHidden } from '../modules/dom.js';
import {
  getActiveView,
  setActiveView,
  getEditingTaskId,
  setEditingTaskId,
  getEditingStudentId,
  setEditingStudentId,
  getEditingAssignmentStudentId,
  setEditingAssignmentStudentId,
  getEditingRewardId,
  setEditingRewardId,
  getTasks,
  setTasks,
  getStudents,
  setStudents,
  getAssignments,
  setAssignments,
  getRewards,
  setRewards,
  getPointPresets,
  setPointPresets,
  getActivePointPresetTab,
  setActivePointPresetTab,
  getEditingPointPresetId,
  setEditingPointPresetId,
  getNotificationsUnread,
  setNotificationsUnread,
  setUser
} from './state.js';
import {
  populateTaskForm,
  readTaskForm,
  renderTaskList,
  setupTaskTypeToggle,
  resetTaskForm
} from './tasks.js';
import {
  populateStudentForm,
  readStudentForm,
  renderStudentList,
  resetStudentForm
} from './students.js';
import {
  renderAssignmentList,
  setStudentOptions,
  renderTaskCheckboxes,
  populateAssignmentForm,
  resetAssignmentForm,
  readAssignmentForm
} from './assignments.js';
import {
  populateRewardForm,
  readRewardForm,
  renderRewardList,
  resetRewardForm
} from './rewards.js';


const VALID_VIEWS = ['students', 'tasks', 'assignments', 'rewards', 'point-presets'];
const DEFAULT_VIEW = 'students';
const CONFIG_VIEWS = new Set(VALID_VIEWS);
const ADMIN_VIEWS = new Set(['analytics', 'plan-approvals', 'approvals', 'notifications']);
const POINT_PAGE_PATHS = {
  bonus: '/points-bonus.html',
  penalty: '/points-penalty.html',
  redeem: '/points-redeem.html'
};

const sidebarRoot = qs('[data-component="parent-sidebar"]');
const initialViewFromQuery = new URLSearchParams(window.location.search).get('view');
const initialSidebarKey = (() => {
  const normalized = normalizeView(initialViewFromQuery);
  if (normalized === 'students') return 'config:students';
  if (normalized === 'tasks') return 'config:tasks';
  if (normalized === 'assignments') return 'config:assignments';
  if (normalized === 'rewards') return 'config:rewards';
  if (normalized === 'point-presets') return 'config:point-presets';
  return 'config:students';
})();

renderParentSidebar(sidebarRoot, { activeKey: initialSidebarKey });

const TEXT = {
  task: {
    modalCreateTitle: '新增任务',
    modalEditTitle: '编辑任务',
    loading: '正在加载任务...',
    deleteSuccess: '任务已删除',
    saveInProgress: '正在保存...',
    updateSuccess: '任务已更新',
    createSuccess: '任务创建成功',
    titleRequired: '必须填写任务标题',
    pointsInvalid: '请输入有效的积分数值',
    scheduleInvalid: '请选择任务类型',
    recurringDayInvalid: '请选择定期任务的执行星期',
    confirmDelete: (title) => `确认删除任务「${title}」吗？`
  },
  student: {
    modalCreateTitle: '新增学生',
    modalEditTitle: '编辑学生',
    loading: '正在加载学生账号...',
    deleteSuccess: '学生账号已删除',
    saveInProgress: '正在保存账号信息...',
    updateSuccess: '学生账号已更新',
    createSuccess: '学生账号创建成功',
    fieldRequired: '请填写完整的登录信息',
    passwordRequired: '请为新学生设置登录密码',
    confirmDelete: (name) => `确认删除学生「${name}」吗？`
  },
  assignment: {
    modalCreateTitle: '新增分配',
    modalEditTitle: '编辑分配',
    loading: '正在加载任务分配...',
    saveInProgress: '正在保存分配信息...',
    saveSuccess: '分配信息已保存',
    deleteSuccess: '分配已删除',
    studentRequired: '请选择学生',
    taskRequired: '至少选择一个任务',
    noStudents: '请先创建学生账号',
    noTasks: '请先创建任务',
    confirmDelete: (name) => `确认清空学生「${name}」的所有分配吗？`
  },
  reward: {
    modalCreateTitle: '新增奖励',
    modalEditTitle: '编辑奖励',
    loading: '正在加载奖励...',
    saveInProgress: '正在保存奖励...',
    saveSuccess: '奖励保存成功',
    deleteSuccess: '奖励已删除',
    titleRequired: '请填写奖励名称',
    pointsInvalid: '积分值需为不小于 0 的整数',
    stockInvalid: '库存需为不小于 0 的整数，或留空表示不限',
    confirmDelete: (title) => `确认删除奖励「${title}」吗？`
  },
  pointPreset: {
    modalCreateTitle: '新增模版',
    modalEditTitle: '编辑模版',
    loading: '正在加载奖惩模版...',
    saveInProgress: '正在保存模版...',
    saveSuccess: '模版保存成功',
    deleteSuccess: '模版已删除',
    nameRequired: '请填写项目名称',
    pointsInvalid: '分值需为不小于 0 的整数',
    confirmDelete: (name) => `确认删除模版「${name}」吗？`,
    emptyBonus: '还没有加分模版',
    emptyPenalty: '还没有减分模版',
    emptyHint: '添加常用奖惩模版，在积分管理里即可一键套用。'
  }
};

const elements = {
  views: Array.from(document.querySelectorAll('.view')),
  navContainer: qs('.sidebar__nav'),
  navStudents: qs('#navStudents'),
  navTasks: qs('#navTasks'),
  navAssignments: qs('#navAssignments'),
  navRewards: qs('#navRewards'),
  navPointPresets: qs('#navPointPresets'),
  sidebarToggles: qsa('[data-section-toggle]'),
  logoutButton: qs('#logoutButton'),
  addTaskBtn: qs('#addTaskBtn'),
  addStudentBtn: qs('#addStudentBtn'),
  addAssignmentBtn: qs('#addAssignmentBtn'),
  addRewardBtn: qs('#addRewardBtn'),
  addPointPresetBtn: qs('#addPointPresetBtn'),
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
  task: {
    message: qs('#taskMessage'),
    list: qs('#taskList'),
    modal: qs('#taskModal'),
    title: qs('#taskModalTitle'),
    form: qs('#taskForm'),
    formMessage: qs('#taskFormMessage'),
    cancelBtn: qs('#cancelTaskBtn'),
    closeBtn: qs('#closeTaskModal')
  },
  student: {
    message: qs('#studentMessage'),
    list: qs('#studentList'),
    modal: qs('#studentModal'),
    title: qs('#studentModalTitle'),
    form: qs('#studentForm'),
    formMessage: qs('#studentFormMessage'),
    cancelBtn: qs('#cancelStudentBtn'),
    closeBtn: qs('#closeStudentModal')
  },
  assignment: {
    message: qs('#assignmentMessage'),
    list: qs('#assignmentList'),
    modal: qs('#assignmentModal'),
    title: qs('#assignmentModalTitle'),
    form: qs('#assignmentForm'),
    formMessage: qs('#assignmentFormMessage'),
    cancelBtn: qs('#cancelAssignmentBtn'),
    closeBtn: qs('#closeAssignmentModal'),
    taskContainer: qs('[data-assignment-tasks]')
  },
  reward: {
    message: qs('#rewardMessage'),
    list: qs('#rewardList'),
    modal: qs('#rewardModal'),
    title: qs('#rewardModalTitle'),
    form: qs('#rewardForm'),
    formMessage: qs('#rewardFormMessage'),
    cancelBtn: qs('#cancelRewardBtn'),
    closeBtn: qs('#closeRewardModal')
  },
  pointPreset: {
    message: qs('#pointPresetMessage'),
    list: qs('#pointPresetList'),
    tabContainer: qs('[data-preset-tabs]'),
    modal: qs('#pointPresetModal'),
    title: qs('#pointPresetModalTitle'),
    form: qs('#pointPresetForm'),
    formMessage: qs('#pointPresetFormMessage'),
    cancelBtn: qs('#cancelPointPresetBtn'),
    closeBtn: qs('#closePointPresetModal')
  }
};

function normalizeView(value) {
  if (!value) return DEFAULT_VIEW;
  const key = String(value).trim().toLowerCase();
  return VALID_VIEWS.includes(key) ? key : DEFAULT_VIEW;
}

function readViewFromSearch() {
  const params = new URLSearchParams(window.location.search);
  return normalizeView(params.get('view'));
}

function updateLocation(view) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
}

function getNavButtons() {
  if (!elements.navContainer) return [];
  return qsa('[data-view]', elements.navContainer);
}

function highlightNav(view) {
  const buttons = getNavButtons();
  buttons.forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('nav-item--active', isActive);
    if (isActive) {
      const section = button.closest('.sidebar-section');
      if (section) {
        section.classList.remove('is-collapsed');
        const toggle = section.querySelector('[data-section-toggle]');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'true');
        }
        const content = section.querySelector('[data-section-content]');
        if (content) {
          content.setAttribute('aria-hidden', 'false');
        }
      }
    }
  });
}

function showView(view) {
  const normalized = normalizeView(view);
  setActiveView(normalized);
  highlightNav(normalized);
  elements.views.forEach((section) => {
    const visible = section.dataset.view === normalized;
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

async function refreshUnreadNotifications() {
  try {
    const { total } = await fetchUnreadNotificationsCount();
    setNotificationsUnread(total ?? 0);
    updateNotificationBadge();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[config] failed to refresh unread notifications', error);
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

// ----- Task helpers -----

function setTaskModalMode(mode) {
  if (!elements.task.modal) return;
  elements.task.modal.dataset.mode = mode;
  if (elements.task.title) {
    elements.task.title.textContent =
      mode === 'edit' ? TEXT.task.modalEditTitle : TEXT.task.modalCreateTitle;
  }
}

function openTaskModal(mode, task = null) {
  setTaskModalMode(mode);
  if (elements.task.formMessage) setMessage(elements.task.formMessage, '', '');
  if (mode === 'edit' && task) {
    populateTaskForm(elements.task.form, task);
    setEditingTaskId(task.id);
  } else {
    resetTaskForm(elements.task.form);
    setEditingTaskId(null);
  }
  if (elements.task.modal) elements.task.modal.hidden = false;
}

function closeTaskModal() {
  if (elements.task.modal) elements.task.modal.hidden = true;
  if (elements.task.form) resetTaskForm(elements.task.form);
  setEditingTaskId(null);
  if (elements.task.formMessage) setMessage(elements.task.formMessage, '', '');
}

async function loadTasks() {
  try {
    if (elements.task.list) {
      elements.task.list.innerHTML = `<p class="loading">${TEXT.task.loading}</p>`;
    }
    const { tasks } = await fetchTasks();
    setTasks(tasks ?? []);
    renderTaskList(elements.task.list, getTasks(), {
      onEdit: handleEditTask,
      onDelete: handleDeleteTask
    });
    if (elements.task.message) {
      setMessage(elements.task.message, '', '');
    }
  } catch (error) {
    if (elements.task.list) elements.task.list.innerHTML = '';
    if (elements.task.message) {
      setMessage(elements.task.message, error.message, 'error');
    }
  }
}

function handleEditTask(taskId) {
  const task = getTasks().find((item) => item.id === taskId);
  if (!task) return;
  openTaskModal('edit', task);
}

async function handleDeleteTask(taskId) {
  const task = getTasks().find((item) => item.id === taskId);
  if (!task) return;
  const confirmed = window.confirm(TEXT.task.confirmDelete(task.title));
  if (!confirmed) return;
  try {
    await removeTask(taskId);
    if (elements.task.message) {
      setMessage(elements.task.message, TEXT.task.deleteSuccess, 'success');
    }
    await loadTasks();
  } catch (error) {
    if (elements.task.message) {
      setMessage(elements.task.message, error.message, 'error');
    }
  }
}

async function submitTask(event) {
  event.preventDefault();
  const payload = readTaskForm(elements.task.form);
  if (!payload.title) {
    setMessage(elements.task.formMessage, TEXT.task.titleRequired, 'error');
    return;
  }
  if (!Number.isInteger(payload.points) || payload.points < 0) {
    setMessage(elements.task.formMessage, TEXT.task.pointsInvalid, 'error');
    return;
  }
  if (!payload.scheduleType) {
    setMessage(elements.task.formMessage, TEXT.task.scheduleInvalid, 'error');
    return;
  }
  if (payload.scheduleType === 'recurring' && !Number.isInteger(payload.recurringDayOfWeek)) {
    setMessage(elements.task.formMessage, TEXT.task.recurringDayInvalid, 'error');
    return;
  }

  const editingId = getEditingTaskId();
  try {
    disableForm(elements.task.form, true);
    setMessage(elements.task.formMessage, TEXT.task.saveInProgress, 'info');
    if (editingId) {
      await updateTask(editingId, payload);
      if (elements.task.message) {
        setMessage(elements.task.message, TEXT.task.updateSuccess, 'success');
      }
    } else {
      await createTask(payload);
      if (elements.task.message) {
        setMessage(elements.task.message, TEXT.task.createSuccess, 'success');
      }
    }
    await loadTasks();
    closeTaskModal();
  } catch (error) {
    setMessage(elements.task.formMessage, error.message, 'error');
  } finally {
    disableForm(elements.task.form, false);
  }
}

// ----- Student helpers -----

function setStudentModalMode(mode) {
  if (!elements.student.modal) return;
  elements.student.modal.dataset.mode = mode;
  if (elements.student.title) {
    elements.student.title.textContent =
      mode === 'edit' ? TEXT.student.modalEditTitle : TEXT.student.modalCreateTitle;
  }
}

function openStudentModal(mode, student = null) {
  setStudentModalMode(mode);
  if (elements.student.formMessage) setMessage(elements.student.formMessage, '', '');
  if (mode === 'edit' && student) {
    populateStudentForm(elements.student.form, student);
    setEditingStudentId(student.id);
  } else {
    resetStudentForm(elements.student.form);
    setEditingStudentId(null);
  }
  if (elements.student.modal) elements.student.modal.hidden = false;
}

function closeStudentModal() {
  if (elements.student.modal) elements.student.modal.hidden = true;
  if (elements.student.form) resetStudentForm(elements.student.form);
  setEditingStudentId(null);
  if (elements.student.formMessage) setMessage(elements.student.formMessage, '', '');
}

async function loadStudents() {
  try {
    if (elements.student.list) {
      elements.student.list.innerHTML = `<p class="loading">${TEXT.student.loading}</p>`;
    }
    const { students } = await fetchStudents();
    setStudents(students ?? []);
    renderStudentList(elements.student.list, getStudents(), {
      onEdit: handleEditStudent,
      onDelete: handleDeleteStudent
    });
    if (elements.student.message) {
      setMessage(elements.student.message, '', '');
    }
  } catch (error) {
    if (elements.student.list) elements.student.list.innerHTML = '';
    if (elements.student.message) {
      setMessage(elements.student.message, error.message, 'error');
    }
  }
}

function handleEditStudent(studentId) {
  const student = getStudents().find((item) => item.id === studentId);
  if (!student) return;
  openStudentModal('edit', student);
}

async function handleDeleteStudent(studentId) {
  const student = getStudents().find((item) => item.id === studentId);
  if (!student) return;
  const name = student.name || student.loginName;
  const confirmed = window.confirm(TEXT.student.confirmDelete(name));
  if (!confirmed) return;
  try {
    await removeStudent(studentId);
    if (elements.student.message) {
      setMessage(elements.student.message, TEXT.student.deleteSuccess, 'success');
    }
    await loadStudents();
  } catch (error) {
    if (elements.student.message) {
      setMessage(elements.student.message, error.message, 'error');
    }
  }
}

async function submitStudent(event) {
  event.preventDefault();
  const values = readStudentForm(elements.student.form);
  if (!values.name || !values.loginName) {
    setMessage(elements.student.formMessage, TEXT.student.fieldRequired, 'error');
    return;
  }
  if (!getEditingStudentId() && !values.password) {
    setMessage(elements.student.formMessage, TEXT.student.passwordRequired, 'error');
    return;
  }

  const editingId = getEditingStudentId();
  try {
    disableForm(elements.student.form, true);
    setMessage(elements.student.formMessage, TEXT.student.saveInProgress, 'info');
    if (editingId) {
      await updateStudent(editingId, values);
      if (elements.student.message) {
        setMessage(elements.student.message, TEXT.student.updateSuccess, 'success');
      }
    } else {
      await createStudent(values);
      if (elements.student.message) {
        setMessage(elements.student.message, TEXT.student.createSuccess, 'success');
      }
    }
    await loadStudents();
    closeStudentModal();
  } catch (error) {
    setMessage(elements.student.formMessage, error.message, 'error');
  } finally {
    disableForm(elements.student.form, false);
  }
}

// ----- Assignment helpers -----

async function ensureAssignmentDependencies() {
  if (!getStudents().length) {
    try {
      const { students } = await fetchStudents();
      setStudents(students ?? []);
    } catch (error) {
      throw new Error(error.message || TEXT.assignment.noStudents);
    }
  }
  if (!getTasks().length) {
    try {
      const { tasks } = await fetchTasks();
      setTasks(tasks ?? []);
    } catch (error) {
      throw new Error(error.message || TEXT.assignment.noTasks);
    }
  }
}

function renderAssignmentState() {
  renderAssignmentList(elements.assignment.list, getAssignments(), {
    onEdit: handleEditAssignment,
    onDelete: handleDeleteAssignment
  });
}

function prepareAssignmentFormOptions() {
  if (!elements.assignment.form) return;
  const select = elements.assignment.form.elements.studentId;
  if (select) {
    setStudentOptions(select, getStudents());
  }
  renderTaskCheckboxes(elements.assignment.taskContainer, getTasks());
}

function setAssignmentModalMode(mode) {
  if (!elements.assignment.modal) return;
  elements.assignment.modal.dataset.mode = mode;
  if (elements.assignment.title) {
    elements.assignment.title.textContent =
      mode === 'edit' ? TEXT.assignment.modalEditTitle : TEXT.assignment.modalCreateTitle;
  }
}

function openAssignmentModal(mode, assignment = null) {
  setAssignmentModalMode(mode);
  if (elements.assignment.formMessage) setMessage(elements.assignment.formMessage, '', '');
  prepareAssignmentFormOptions();
  if (mode === 'edit' && assignment) {
    populateAssignmentForm(elements.assignment.form, assignment);
    setEditingAssignmentStudentId(assignment.student?.id ?? null);
    if (elements.assignment.form.elements.studentId) {
      elements.assignment.form.elements.studentId.disabled = true;
    }
  } else {
    resetAssignmentForm(elements.assignment.form);
    setEditingAssignmentStudentId(null);
    if (elements.assignment.form.elements.studentId) {
      elements.assignment.form.elements.studentId.disabled = false;
    }
  }
  if (elements.assignment.modal) elements.assignment.modal.hidden = false;
}

function closeAssignmentModal() {
  if (elements.assignment.modal) elements.assignment.modal.hidden = true;
  if (elements.assignment.form) {
    resetAssignmentForm(elements.assignment.form);
    if (elements.assignment.form.elements.studentId) {
      elements.assignment.form.elements.studentId.disabled = false;
    }
  }
  setEditingAssignmentStudentId(null);
  if (elements.assignment.formMessage) setMessage(elements.assignment.formMessage, '', '');
}

async function loadAssignments() {
  try {
    if (elements.assignment.list) {
      elements.assignment.list.innerHTML = `<p class="loading">${TEXT.assignment.loading}</p>`;
    }
    const { assignments } = await fetchAssignments();
    setAssignments(assignments ?? []);
    renderAssignmentState();
    if (elements.assignment.message) {
      setMessage(elements.assignment.message, '', '');
    }
  } catch (error) {
    if (elements.assignment.list) elements.assignment.list.innerHTML = '';
    if (elements.assignment.message) {
      setMessage(elements.assignment.message, error.message, 'error');
    }
  }
}

async function handleAddAssignment() {
  try {
    await ensureAssignmentDependencies();
    if (!getStudents().length) {
      setMessage(elements.assignment.message, TEXT.assignment.noStudents, 'info');
      return;
    }
    if (!getTasks().length) {
      setMessage(elements.assignment.message, TEXT.assignment.noTasks, 'info');
      return;
    }
    openAssignmentModal('create');
  } catch (error) {
    if (elements.assignment.message) {
      setMessage(elements.assignment.message, error.message, 'error');
    }
  }
}

async function handleEditAssignment(studentId) {
  try {
    await ensureAssignmentDependencies();
    const assignment =
      getAssignments().find((item) => item.student.id === studentId) ||
      {
        student: getStudents().find((student) => student.id === studentId) || { id: studentId },
        tasks: [],
        taskIds: []
      };
    openAssignmentModal('edit', assignment);
  } catch (error) {
    if (elements.assignment.message) {
      setMessage(elements.assignment.message, error.message, 'error');
    }
  }
}

async function handleDeleteAssignment(studentId) {
  const assignment = getAssignments().find((item) => item.student.id === studentId);
  const name = assignment?.student?.name || assignment?.student?.loginName || '该学生';
  const confirmed = window.confirm(TEXT.assignment.confirmDelete(name));
  if (!confirmed) return;
  try {
    const { assignments } = await removeAssignments(studentId);
    setAssignments(assignments ?? []);
    renderAssignmentState();
    if (elements.assignment.message) {
      setMessage(elements.assignment.message, TEXT.assignment.deleteSuccess, 'success');
    }
  } catch (error) {
    if (elements.assignment.message) {
      setMessage(elements.assignment.message, error.message, 'error');
    }
  }
}

async function submitAssignment(event) {
  event.preventDefault();
  const { studentId, taskIds } = readAssignmentForm(elements.assignment.form);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    setMessage(elements.assignment.formMessage, TEXT.assignment.studentRequired, 'error');
    return;
  }
  if (!taskIds.length) {
    setMessage(elements.assignment.formMessage, TEXT.assignment.taskRequired, 'error');
    return;
  }

  try {
    disableForm(elements.assignment.form, true);
    setMessage(elements.assignment.formMessage, TEXT.assignment.saveInProgress, 'info');
    const { assignments, assignment } = await saveAssignments({ studentId, taskIds });
    setAssignments(assignments ?? []);
    renderAssignmentState();
    if (assignment && elements.assignment.message) {
      setMessage(elements.assignment.message, TEXT.assignment.saveSuccess, 'success');
    }
    closeAssignmentModal();
  } catch (error) {
    setMessage(elements.assignment.formMessage, error.message, 'error');
  } finally {
    disableForm(elements.assignment.form, false);
  }
}

// ----- Reward helpers -----

function setRewardModalMode(mode) {
  if (!elements.reward.modal) return;
  elements.reward.modal.dataset.mode = mode;
  if (elements.reward.title) {
    elements.reward.title.textContent =
      mode === 'edit' ? TEXT.reward.modalEditTitle : TEXT.reward.modalCreateTitle;
  }
}

function openRewardModal(mode, reward = null) {
  setRewardModalMode(mode);
  if (elements.reward.formMessage) setMessage(elements.reward.formMessage, '', '');
  if (mode === 'edit' && reward) {
    populateRewardForm(elements.reward.form, reward);
    setEditingRewardId(reward.id);
  } else {
    resetRewardForm(elements.reward.form);
    setEditingRewardId(null);
  }
  if (elements.reward.modal) elements.reward.modal.hidden = false;
}

function closeRewardModal() {
  if (elements.reward.modal) elements.reward.modal.hidden = true;
  if (elements.reward.form) resetRewardForm(elements.reward.form);
  setEditingRewardId(null);
  if (elements.reward.formMessage) setMessage(elements.reward.formMessage, '', '');
}

async function loadRewards({ silent } = {}) {
  if (!elements.reward.list) return;
  try {
    if (!silent) {
      elements.reward.list.innerHTML = `<p class="loading">${TEXT.reward.loading}</p>`;
    }
    const { rewards } = await fetchRewards();
    setRewards(rewards ?? []);
    renderRewardList(elements.reward.list, getRewards(), {
      onEdit: handleEditReward,
      onDelete: handleDeleteReward
    });
    if (elements.reward.message) {
      setMessage(elements.reward.message, '', '');
    }
  } catch (error) {
    elements.reward.list.innerHTML = '';
    if (elements.reward.message) {
      setMessage(elements.reward.message, error.message, 'error');
    }
  }
}

function handleEditReward(rewardId) {
  const reward = getRewards().find((item) => item.id === rewardId);
  if (!reward) return;
  openRewardModal('edit', reward);
}

async function handleDeleteReward(rewardId) {
  const reward = getRewards().find((item) => item.id === rewardId);
  if (!reward) return;
  if (!window.confirm(TEXT.reward.confirmDelete(reward.title))) {
    return;
  }
  try {
    await deleteReward(rewardId);
    if (elements.reward.message) {
      setMessage(elements.reward.message, TEXT.reward.deleteSuccess, 'success');
    }
    await loadRewards({ silent: true });
  } catch (error) {
    if (elements.reward.message) {
      setMessage(elements.reward.message, error.message, 'error');
    }
  }
}

async function submitReward(event) {
  event.preventDefault();
  if (!elements.reward.form) return;
  const payload = readRewardForm(elements.reward.form);
  if (!payload.title) {
    setMessage(elements.reward.formMessage, TEXT.reward.titleRequired, 'error');
    return;
  }
  if (!Number.isInteger(payload.pointsCost) || payload.pointsCost < 0) {
    setMessage(elements.reward.formMessage, TEXT.reward.pointsInvalid, 'error');
    return;
  }
  if (payload.stock !== null && (!Number.isInteger(payload.stock) || payload.stock < 0)) {
    setMessage(elements.reward.formMessage, TEXT.reward.stockInvalid, 'error');
    return;
  }

  const editingId = getEditingRewardId();
  try {
    disableForm(elements.reward.form, true);
    setMessage(elements.reward.formMessage, TEXT.reward.saveInProgress, 'info');
    if (editingId) {
      await updateReward(editingId, payload);
    } else {
      await createReward(payload);
    }
    if (elements.reward.message) {
      setMessage(elements.reward.message, TEXT.reward.saveSuccess, 'success');
    }
    await loadRewards({ silent: true });
    closeRewardModal();
  } catch (error) {
    setMessage(elements.reward.formMessage, error.message, 'error');
  } finally {
    disableForm(elements.reward.form, false);
  }
}

// ----- Point preset helpers -----

function normalizePointPresetDirection(preset) {
  if (!preset) return 'bonus';
  if (preset.direction) return preset.direction;
  const value = Number.parseInt(preset.points, 10);
  if (Number.isNaN(value)) return 'bonus';
  return value < 0 ? 'penalty' : 'bonus';
}

function formatPointPresetPoints(direction, points) {
  const value = Number.parseInt(points, 10);
  const safe = Number.isNaN(value) ? 0 : value;
  const sign = direction === 'penalty' ? '-' : '+';
  return `${sign}${Math.abs(safe)}`;
}

function renderPointPresetList(container, presets, direction, { onEdit, onDelete }) {
  if (!container) return;
  const normalizedDirection = direction === 'penalty' ? 'penalty' : 'bonus';
  // eslint-disable-next-line no-param-reassign
  container.dataset.activeTab = normalizedDirection;

  if (!Array.isArray(presets) || presets.length === 0) {
    const isPenalty = normalizedDirection === 'penalty';
    container.innerHTML = `
      <div class="empty-state">
        <strong>${isPenalty ? TEXT.pointPreset.emptyPenalty : TEXT.pointPreset.emptyBonus}</strong>
        <span>${TEXT.pointPreset.emptyHint}</span>
      </div>
    `;
    return;
  }

  const rows = presets
    .map((preset) => {
      const directionLabel = normalizePointPresetDirection(preset);
      const name = preset.name || preset.title || '未命名模版';
      const pointsLabel = formatPointPresetPoints(directionLabel, preset.points);
      return `
        <tr>
          <td>${name}</td>
          <td>${pointsLabel}</td>
          <td>
            <div class="table__actions">
              <button type="button" class="ghost-button" data-action="edit-point-preset" data-id="${preset.id}">
                编辑
              </button>
              <button type="button" class="ghost-button" data-action="delete-point-preset" data-id="${preset.id}">
                删除
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>项目名称</th>
          <th>分值</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  container.querySelectorAll('[data-action="edit-point-preset"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number.parseInt(button.dataset.id, 10);
      if (Number.isInteger(id) && onEdit) {
        onEdit(id);
      }
    });
  });

  container.querySelectorAll('[data-action="delete-point-preset"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number.parseInt(button.dataset.id, 10);
      if (Number.isInteger(id) && onDelete) {
        onDelete(id);
      }
    });
  });
}

function getPointPresetsByDirection(direction) {
  const target = direction === 'penalty' ? 'penalty' : 'bonus';
  const all = getPointPresets() || [];
  return all.filter((preset) => normalizePointPresetDirection(preset) === target);
}

function updatePointPresetTabUI(activeDirection = getActivePointPresetTab()) {
  if (!elements.pointPreset.tabContainer) return;
  const buttons = qsa('[data-preset-tab]', elements.pointPreset.tabContainer);
  buttons.forEach((button) => {
    const isActive = button.dataset.presetTab === activeDirection;
    button.classList.toggle('chip-button--active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function renderActivePointPresetList() {
  if (!elements.pointPreset.list) return;
  const direction = getActivePointPresetTab();
  updatePointPresetTabUI(direction);
  const presets = getPointPresetsByDirection(direction);
  renderPointPresetList(elements.pointPreset.list, presets, direction, {
    onEdit: handleEditPointPreset,
    onDelete: handleDeletePointPreset
  });
}

function handlePointPresetTabClick(event) {
  const button = event.target.closest('[data-preset-tab]');
  if (!button) return;
  const targetDirection = button.dataset.presetTab === 'penalty' ? 'penalty' : 'bonus';
  if (targetDirection === getActivePointPresetTab()) {
    return;
  }
  setActivePointPresetTab(targetDirection);
  renderActivePointPresetList();
}

function populatePointPresetForm(form, preset) {
  if (!form || !preset) return;
  form.elements.name.value = preset.name || preset.title || '';
  const direction = normalizePointPresetDirection(preset);
  const value = Math.abs(Number.parseInt(preset.points, 10) || 0);
  form.elements.points.value = value.toString();
  if (form.elements.direction) {
    Array.from(form.elements.direction).forEach((input) => {
      input.checked = input.value === direction;
    });
  }
}

function readPointPresetForm(form) {
  if (!form) return null;
  const name = form.elements.name.value.trim();
  const pointsRaw = Number.parseInt(form.elements.points.value, 10);
  const points = Number.isNaN(pointsRaw) ? null : Math.abs(pointsRaw);
  const direction = form.elements.direction.value === 'penalty' ? 'penalty' : 'bonus';
  return { name, points, direction };
}

function openPointPresetModal(mode, preset = null) {
  if (!elements.pointPreset.modal) return;
  elements.pointPreset.modal.dataset.mode = mode;
  elements.pointPreset.modal.hidden = false;
  if (elements.pointPreset.title) {
    elements.pointPreset.title.textContent =
      mode === 'edit' ? TEXT.pointPreset.modalEditTitle : TEXT.pointPreset.modalCreateTitle;
  }
  if (elements.pointPreset.formMessage) {
    setMessage(elements.pointPreset.formMessage, '', '');
  }
  if (mode === 'edit' && preset) {
    populatePointPresetForm(elements.pointPreset.form, preset);
    setEditingPointPresetId(preset.id);
  } else if (elements.pointPreset.form) {
    elements.pointPreset.form.reset();
    const activeDirection = getActivePointPresetTab();
    if (elements.pointPreset.form.elements.direction) {
      Array.from(elements.pointPreset.form.elements.direction).forEach((input) => {
        // eslint-disable-next-line no-param-reassign
        input.checked = input.value === activeDirection;
      });
    }
    setEditingPointPresetId(null);
  }
}

function closePointPresetModal() {
  if (elements.pointPreset.modal) elements.pointPreset.modal.hidden = true;
  if (elements.pointPreset.form) elements.pointPreset.form.reset();
  setEditingPointPresetId(null);
  if (elements.pointPreset.formMessage) setMessage(elements.pointPreset.formMessage, '', '');
}

async function loadPointPresets({ silent = false } = {}) {
  if (!elements.pointPreset.list) return;
  try {
    if (!silent) {
      elements.pointPreset.list.innerHTML = `<p class="loading">${TEXT.pointPreset.loading}</p>`;
    }
    const { presets } = await fetchQuickAdjustItems();
    const normalized = (presets ?? []).map((item) => {
      const direction = normalizePointPresetDirection(item);
      const value = Math.abs(Number.parseInt(item.points, 10) || 0);
      return { ...item, direction, points: value };
    });
    setPointPresets(normalized);
    renderActivePointPresetList();
    if (elements.pointPreset.message) {
      setMessage(elements.pointPreset.message, '', '');
    }
  } catch (error) {
    const message = (error?.message || '').toLowerCase();
    if (message.includes('not found') || message.includes('404')) {
      setPointPresets([]);
      renderActivePointPresetList();
      if (elements.pointPreset.message) {
        setMessage(elements.pointPreset.message, '', '');
      }
    } else {
      elements.pointPreset.list.innerHTML = '';
      if (elements.pointPreset.message) {
        setMessage(elements.pointPreset.message, error.message, 'error');
      }
      updatePointPresetTabUI();
    }
  }
}

function handleEditPointPreset(presetId) {
  const preset = getPointPresets().find((item) => item.id === presetId);
  if (!preset) return;
  openPointPresetModal('edit', preset);
}

async function handleDeletePointPreset(presetId) {
  const preset = getPointPresets().find((item) => item.id === presetId);
  const name = preset?.name || preset?.title || '该模版';
  if (!window.confirm(TEXT.pointPreset.confirmDelete(name))) {
    return;
  }
  try {
    await deleteQuickAdjustItem(presetId);
    if (elements.pointPreset.message) {
      setMessage(elements.pointPreset.message, TEXT.pointPreset.deleteSuccess, 'success');
    }
    await loadPointPresets({ silent: true });
  } catch (error) {
    if (elements.pointPreset.message) {
      setMessage(elements.pointPreset.message, error.message, 'error');
    }
  }
}

async function submitPointPreset(event) {
  event.preventDefault();
  if (!elements.pointPreset.form) return;
  const payload = readPointPresetForm(elements.pointPreset.form);
  if (!payload.name) {
    setMessage(elements.pointPreset.formMessage, TEXT.pointPreset.nameRequired, 'error');
    return;
  }
  if (!Number.isInteger(payload.points) || payload.points < 0) {
    setMessage(elements.pointPreset.formMessage, TEXT.pointPreset.pointsInvalid, 'error');
    return;
  }

  const editingId = getEditingPointPresetId();
  const requestPayload = {
    name: payload.name,
    points: payload.points,
    direction: payload.direction
  };

  try {
    disableForm(elements.pointPreset.form, true);
    setMessage(elements.pointPreset.formMessage, TEXT.pointPreset.saveInProgress, 'info');
    if (editingId) {
      await updateQuickAdjustItem(editingId, requestPayload);
    } else {
      await createQuickAdjustItem(requestPayload);
    }
    setActivePointPresetTab(requestPayload.direction);
    if (elements.pointPreset.message) {
      setMessage(elements.pointPreset.message, TEXT.pointPreset.saveSuccess, 'success');
    }
    await loadPointPresets({ silent: true });
    closePointPresetModal();
  } catch (error) {
    const message = (error?.message || '').toLowerCase();
    if (message.includes('not found') || message.includes('404')) {
      setMessage(
        elements.pointPreset.formMessage,
        '后台暂未开通奖惩模版接口，请联系管理员配置。',
        'error'
      );
    } else {
      setMessage(elements.pointPreset.formMessage, error.message, 'error');
    }
  } finally {
    disableForm(elements.pointPreset.form, false);
  }
}

// ----- Modal & navigation helpers -----

function setupModalInteractions() {
  if (elements.task.cancelBtn) {
    elements.task.cancelBtn.addEventListener('click', closeTaskModal);
  }
  if (elements.task.closeBtn) {
    elements.task.closeBtn.addEventListener('click', closeTaskModal);
  }
  if (elements.task.modal) {
    elements.task.modal.addEventListener('click', (event) => {
      if (event.target.dataset.action === 'close-modal') {
        closeTaskModal();
      }
    });
  }

  if (elements.student.cancelBtn) {
    elements.student.cancelBtn.addEventListener('click', closeStudentModal);
  }
  if (elements.student.closeBtn) {
    elements.student.closeBtn.addEventListener('click', closeStudentModal);
  }
  if (elements.student.modal) {
    elements.student.modal.addEventListener('click', (event) => {
      if (event.target.dataset.action === 'close-modal') {
        closeStudentModal();
      }
    });
  }

  if (elements.assignment.cancelBtn) {
    elements.assignment.cancelBtn.addEventListener('click', closeAssignmentModal);
  }
  if (elements.assignment.closeBtn) {
    elements.assignment.closeBtn.addEventListener('click', closeAssignmentModal);
  }
  if (elements.assignment.modal) {
    elements.assignment.modal.addEventListener('click', (event) => {
      if (event.target.dataset.action === 'close-modal') {
        closeAssignmentModal();
      }
    });
  }

  if (elements.reward.cancelBtn) {
    elements.reward.cancelBtn.addEventListener('click', closeRewardModal);
  }
  if (elements.reward.closeBtn) {
    elements.reward.closeBtn.addEventListener('click', closeRewardModal);
  }
  if (elements.reward.modal) {
    elements.reward.modal.addEventListener('click', (event) => {
      if (event.target.dataset.action === 'close-modal') {
        closeRewardModal();
      }
    });
  }

  if (elements.pointPreset.cancelBtn) {
    elements.pointPreset.cancelBtn.addEventListener('click', closePointPresetModal);
  }
  if (elements.pointPreset.closeBtn) {
    elements.pointPreset.closeBtn.addEventListener('click', closePointPresetModal);
  }
  if (elements.pointPreset.modal) {
    elements.pointPreset.modal.addEventListener('click', (event) => {
      if (event.target.dataset.action === 'close-modal') {
        closePointPresetModal();
      }
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (elements.task.modal && !elements.task.modal.hidden) {
        closeTaskModal();
      }
      if (elements.student.modal && !elements.student.modal.hidden) {
        closeStudentModal();
      }
      if (elements.assignment.modal && !elements.assignment.modal.hidden) {
        closeAssignmentModal();
      }
      if (elements.reward.modal && !elements.reward.modal.hidden) {
        closeRewardModal();
      }
      if (elements.pointPreset.modal && !elements.pointPreset.modal.hidden) {
        closePointPresetModal();
      }
    }
  });
}

function handleExternalNavigation(link) {
  if (!link) return;
  const target = link.dataset.link;
  if (!target) return;
  window.location.href = target;
}

async function renderCurrentView({ forceReload = false } = {}) {
  const view = getActiveView();
  const normalized = normalizeView(view);
  if (forceReload) {
    if (normalized === 'students') {
      await loadStudents();
    } else if (normalized === 'tasks') {
      await loadTasks();
    } else if (normalized === 'assignments') {
      await ensureAssignmentDependencies();
      await loadAssignments();
    } else if (normalized === 'rewards') {
      await loadRewards({ silent: false });
    } else if (normalized === 'point-presets') {
      updatePointPresetTabUI();
      await loadPointPresets({ silent: false });
    }
    return;
  }

  if (normalized === 'students') {
    await loadStudents();
  } else if (normalized === 'tasks') {
    await loadTasks();
  } else if (normalized === 'assignments') {
    await ensureAssignmentDependencies();
    await loadAssignments();
  } else if (normalized === 'rewards') {
    await loadRewards({ silent: false });
  } else if (normalized === 'point-presets') {
    updatePointPresetTabUI();
    await loadPointPresets({ silent: false });
  }
}

async function changeView(view) {
  const normalized = normalizeView(view);
  if (normalized === getActiveView()) {
    updateLocation(normalized);
    await renderCurrentView({ forceReload: false });
    return;
  }
  setActiveView(normalized);
  showView(normalized);
  updateLocation(normalized);
  await renderCurrentView({ forceReload: false });
}

function setupNavigation() {
  if (elements.navContainer) {
    elements.navContainer.addEventListener('click', (event) => {
      const sectionToggle = event.target.closest('[data-section-toggle]');
      if (sectionToggle) {
        toggleSidebarSection(sectionToggle);
        return;
      }
      const link = event.target.closest('[data-link]');
      if (link) {
        handleExternalNavigation(link);
        return;
      }
      const target = event.target.closest('[data-view]');
      if (!target || target.disabled) return;
      const { view } = target.dataset;
      if (!view) return;
      if (CONFIG_VIEWS.has(view)) {
        changeView(view);
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
      }
    });
  }
  if (elements.topbar.notificationsButton) {
    elements.topbar.notificationsButton.addEventListener('click', (event) => {
      event.preventDefault();
      handleExternalNavigation(elements.topbar.notificationsButton);
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

    const initialView = readViewFromSearch();
    setActiveView(initialView);
    showView(initialView);
    await renderCurrentView();
  } catch (error) {
    window.location.href = '/';
  }
}

function main() {
  setupNavigation();
  setupModalInteractions();

  if (elements.addTaskBtn) {
    elements.addTaskBtn.addEventListener('click', () => openTaskModal('create'));
  }
  if (elements.task.form) {
    setupTaskTypeToggle(elements.task.form);
    elements.task.form.addEventListener('submit', submitTask);
  }

  if (elements.addStudentBtn) {
    elements.addStudentBtn.addEventListener('click', () => openStudentModal('create'));
  }
  if (elements.student.form) {
    elements.student.form.addEventListener('submit', submitStudent);
  }

  if (elements.addAssignmentBtn) {
    elements.addAssignmentBtn.addEventListener('click', handleAddAssignment);
  }
  if (elements.assignment.form) {
    elements.assignment.form.addEventListener('submit', submitAssignment);
  }

  if (elements.addRewardBtn) {
    elements.addRewardBtn.addEventListener('click', () => openRewardModal('create'));
  }
  if (elements.reward.form) {
    elements.reward.form.addEventListener('submit', submitReward);
  }
  if (elements.addPointPresetBtn) {
    elements.addPointPresetBtn.addEventListener('click', () => openPointPresetModal('create'));
  }
  if (elements.pointPreset.tabContainer) {
    elements.pointPreset.tabContainer.addEventListener('click', handlePointPresetTabClick);
    updatePointPresetTabUI();
  }
  if (elements.pointPreset.form) {
    elements.pointPreset.form.addEventListener('submit', submitPointPreset);
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
