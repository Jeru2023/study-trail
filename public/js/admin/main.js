﻿import {
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
  fetchApprovalEntries,
  fetchRewards,
  approveStudentEntry,
  rejectStudentEntry,
  deleteApprovalEntry,
  createReward,
  updateReward,
  deleteReward,
  awardTaskPoints,
  fetchPointStudents,
  fetchStudentPointHistory,
  adjustStudentPoints,
  redeemStudentReward,
  fetchAnalyticsDashboard,
  fetchAnalyticsStudentHistory,
  logout
} from '../modules/apiClient.js';
import { qs, qsa, setMessage, disableForm, toggleHidden } from '../modules/dom.js';
import {
  getActiveView,
  getEditingStudentId,
  getEditingTaskId,
  getEditingAssignmentStudentId,
  getEditingRewardId,
  getStudents,
  getTasks,
  getAssignments,
  getRewards,
  getApprovals,
  getApprovalsDate,
  getPointsStudents,
  getPointsHistory,
  getActivePointsStudentId,
  getRedeemStudents,
  getRedeemHistory,
  getActiveRedeemStudentId,
  setActiveView,
  setEditingStudentId,
  setEditingTaskId,
  setEditingAssignmentStudentId,
  setEditingRewardId,
  setStudents,
  setTasks,
  setAssignments,
  setRewards,
  setApprovals,
  setApprovalsDate,
  setPointsStudents,
  setPointsHistory,
  setActivePointsStudentId,
  setRedeemStudents,
  setRedeemHistory,
  setActiveRedeemStudentId,
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
import { populateTaskForm, readTaskForm, renderTaskList, resetTaskForm } from './tasks.js';
import { populateStudentForm, readStudentForm, renderStudentList, resetStudentForm } from './students.js';
import {
  renderAssignmentList,
  setStudentOptions,
  renderTaskCheckboxes,
  populateAssignmentForm,
  resetAssignmentForm,
  readAssignmentForm
} from './assignments.js';
import { renderApprovalList } from './approvals.js';
import {
  populateRewardForm,
  readRewardForm,
  renderRewardList,
  resetRewardForm
} from './rewards.js';
import { renderPointsHistory, renderPointsStudentList } from './points.js';
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
  approval: {
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
  points: {
    loading: '正在加载积分数据...',
    refreshSuccess: '积分信息已刷新',
    historyRefreshSuccess: '积分记录已更新',
    adjustSuccess: '积分调整成功',
    adjustInProgress: '正在提交调整...',
    adjustInvalid: '请输入非零的整数积分',
    selectStudent: '请先选择学生账号'
  },
  redeem: {
    loading: '正在加载积分数据...',
    refreshSuccess: '兑换信息已刷新',
    historyRefreshSuccess: '积分记录已更新',
    redeemSuccess: '兑换成功，已扣除相应积分',
    redeemInProgress: '正在提交兑换...',
    selectStudent: '请先选择学生账号',
    noRewards: '暂无可兑换的奖励，请先在积分商城中新增'
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

const elements = {
  views: Array.from(document.querySelectorAll('.view')),
  navContainer: qs('.sidebar__nav'),
  navTasks: qs('#navTasks'),
  navStudents: qs('#navStudents'),
  navAssignments: qs('#navAssignments'),
  navApprovals: qs('#navApprovals'),
  navRewards: qs('#navRewards'),
  navRedeem: qs('#navRedeem'),
  navPoints: qs('#navPoints'),
  navAnalytics: qs('#navAnalytics'),
  addTaskBtn: qs('#addTaskBtn'),
  addStudentBtn: qs('#addStudentBtn'),
  addAssignmentBtn: qs('#addAssignmentBtn'),
  addRewardBtn: qs('#addRewardBtn'),
  logoutButton: qs('#logoutButton'),
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
  points: {
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
    adjustForm: qs('#pointsAdjustForm'),
    adjustMessage: qs('#pointsAdjustMessage'),
    historyList: qs('#pointsHistoryList')
  },
  redeem: {
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
  },
  approval: {
    message: qs('#approvalMessage'),
    list: qs('#approvalList'),
    refreshBtn: qs('#refreshApprovalsBtn'),
    dateLabel: qs('#approvalDateLabel')
  },
  avatar: {
    sidebar: qs('#sidebarAvatar'),
    topbar: qs('#topbarAvatar')
  },
  name: {
    sidebar: qs('#sidebarUserName'),
    topbar: qs('#topbarUserName')
  }
};

function getNavButtons() {
  return elements.navContainer ? qsa('[data-view]', elements.navContainer) : [];
}

function highlightNav(view) {
  getNavButtons().forEach((button) => {
    if (button.dataset.view === view) {
      button.classList.add('nav-item--active');
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
  } catch (error) {
    if (elements.task.list) elements.task.list.innerHTML = '';
    setMessage(elements.task.message, error.message, 'error');
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
    setMessage(elements.task.message, TEXT.task.deleteSuccess, 'success');
    await loadTasks();
  } catch (error) {
    setMessage(elements.task.message, error.message, 'error');
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

  const editingId = getEditingTaskId();
  try {
    disableForm(elements.task.form, true);
    setMessage(elements.task.formMessage, TEXT.task.saveInProgress, 'info');
    if (editingId) {
      await updateTask(editingId, payload);
      setMessage(elements.task.message, TEXT.task.updateSuccess, 'success');
    } else {
      await createTask(payload);
      setMessage(elements.task.message, TEXT.task.createSuccess, 'success');
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
  } catch (error) {
    if (elements.student.list) elements.student.list.innerHTML = '';
    setMessage(elements.student.message, error.message, 'error');
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
    setMessage(elements.student.message, TEXT.student.deleteSuccess, 'success');
    await loadStudents();
  } catch (error) {
    setMessage(elements.student.message, error.message, 'error');
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
      setMessage(elements.student.message, TEXT.student.updateSuccess, 'success');
    } else {
      await createStudent(values);
      setMessage(elements.student.message, TEXT.student.createSuccess, 'success');
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
  } catch (error) {
    if (elements.assignment.list) elements.assignment.list.innerHTML = '';
    setMessage(elements.assignment.message, error.message, 'error');
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
    setMessage(elements.assignment.message, error.message, 'error');
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
    setMessage(elements.assignment.message, error.message, 'error');
  }
}

async function handleDeleteAssignment(studentId) {
  const assignment = getAssignments().find((item) => item.student.id === studentId);
  const name = assignment?.student?.name || assignment?.student?.loginName || '锟斤拷学锟斤拷';
  const confirmed = window.confirm(TEXT.assignment.confirmDelete(name));
  if (!confirmed) return;
  try {
    const { assignments } = await removeAssignments(studentId);
    setAssignments(assignments ?? []);
    renderAssignmentState();
    setMessage(elements.assignment.message, TEXT.assignment.deleteSuccess, 'success');
  } catch (error) {
    setMessage(elements.assignment.message, error.message, 'error');
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
    if (assignment) {
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
  if (
    payload.stock !== null &&
    (!Number.isInteger(payload.stock) || payload.stock < 0)
  ) {
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

function setHistoryPlaceholder(listElement) {
  if (!listElement) return;
  listElement.innerHTML =
    '<li class="points-history__item"><p class="points-history__item-note">暂无积分记录。</p></li>';
}

function resetPointsDetail() {
  if (!elements.points.detail) return;
  elements.points.detail.dataset.empty = 'true';
  if (elements.points.detailContent) {
    elements.points.detailContent.hidden = true;
  }
  if (elements.points.studentName) elements.points.studentName.textContent = '学生姓名';
  if (elements.points.studentLogin) elements.points.studentLogin.textContent = '';
  if (elements.points.studentUpdated) elements.points.studentUpdated.textContent = '';
  if (elements.points.studentBalance) elements.points.studentBalance.textContent = '0';
  if (elements.points.adjustForm) {
    elements.points.adjustForm.reset();
    setMessage(elements.points.adjustMessage, '', '');
  }
  setHistoryPlaceholder(elements.points.historyList);
}

function populatePointsDetail(student) {
  if (!elements.points.detail) return;
  if (!student) {
    resetPointsDetail();
    return;
  }

  elements.points.detail.dataset.empty = 'false';
  if (elements.points.detailContent) {
    elements.points.detailContent.hidden = false;
  }

  const displayName = student.displayName || student.loginName;
  if (elements.points.studentName) elements.points.studentName.textContent = displayName;
  if (elements.points.studentLogin) {
    elements.points.studentLogin.textContent = `登录名：${student.loginName}`;
  }
  if (elements.points.studentUpdated) {
    const fallback = student.updatedAt || '';
    const last = student.lastActivityAt || fallback;
    elements.points.studentUpdated.textContent = last
      ? `最近更新：${formatPointsDateLabel(last)}`
      : '暂无积分记录';
  }
  if (elements.points.studentBalance) {
    elements.points.studentBalance.textContent = student.pointsBalance;
  }
  if (elements.points.adjustForm) {
    elements.points.adjustForm.reset();
  }
  setMessage(elements.points.adjustMessage, '', '');
}


async function loadPointsHistory(studentId, { silent = false } = {}) {
  if (!studentId) {
    setPointsHistory([]);
    setHistoryPlaceholder(elements.points.historyList);
    return;
  }
  try {
    const { entries } = await fetchStudentPointHistory(studentId);
    setPointsHistory(entries ?? []);
    renderPointsHistory(elements.points.historyList, getPointsHistory());
    if (!silent && elements.points.message) {
      setMessage(elements.points.message, TEXT.points.historyRefreshSuccess, 'success');
    }
  } catch (error) {
    if (elements.points.message) {
      setMessage(elements.points.message, error.message, 'error');
    }
  }
}

async function loadPointStudents({ silent = false, preserveSelection = false } = {}) {
  if (!elements.points.studentList) return;
  try {
    if (!silent && elements.points.message) {
      setMessage(elements.points.message, TEXT.points.loading, 'info');
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
    renderPointsStudentList(elements.points.studentList, list, activeId ?? null);

    if (activeId) {
      const current = list.find((student) => student.id === activeId);
      populatePointsDetail(current);
      await loadPointsHistory(activeId, { silent: true });
    } else {
      resetPointsDetail();
      setPointsHistory([]);
      setHistoryPlaceholder(elements.points.historyList);
    }

    if (!silent && elements.points.message) {
      setMessage(elements.points.message, TEXT.points.refreshSuccess, 'success');
    }
  } catch (error) {
    if (elements.points.message) {
      setMessage(elements.points.message, error.message, 'error');
    }
    resetPointsDetail();
    setPointsStudents([]);
    setPointsHistory([]);
    setActivePointsStudentId(null);
    setHistoryPlaceholder(elements.points.historyList);
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
  renderPointsStudentList(elements.points.studentList, getPointsStudents(), studentId);
  const current = getPointsStudents().find((student) => student.id === studentId);
  populatePointsDetail(current);
  loadPointsHistory(studentId, { silent: true });
}

async function submitPointsAdjust(event) {
  event.preventDefault();
  if (!elements.points.adjustForm) return;
  const studentId = getActivePointsStudentId();
  if (!studentId) {
    setMessage(elements.points.adjustMessage, TEXT.points.selectStudent, 'error');
    return;
  }

  const formData = new FormData(elements.points.adjustForm);
  const deltaValue = Number.parseInt(formData.get('delta'), 10);
  const note = formData.get('note')?.trim();

  if (!Number.isInteger(deltaValue) || deltaValue === 0) {
    setMessage(elements.points.adjustMessage, TEXT.points.adjustInvalid, 'error');
    return;
  }

  try {
    disableForm(elements.points.adjustForm, true);
    setMessage(elements.points.adjustMessage, TEXT.points.adjustInProgress, 'info');
    const payload = note ? { delta: deltaValue, note } : { delta: deltaValue };
    await adjustStudentPoints(studentId, payload);
    setMessage(elements.points.adjustMessage, TEXT.points.adjustSuccess, 'success');
    elements.points.adjustForm.reset();
    await loadPointStudents({ silent: true, preserveSelection: true });
  } catch (error) {
    setMessage(elements.points.adjustMessage, error.message, 'error');
  } finally {
    disableForm(elements.points.adjustForm, false);
  }
}

function resetRedeemDetail() {
  if (!elements.redeem.detail) return;
  elements.redeem.detail.dataset.empty = 'true';
  if (elements.redeem.detailContent) {
    elements.redeem.detailContent.hidden = true;
  }
  if (elements.redeem.studentName) elements.redeem.studentName.textContent = '学生姓名';
  if (elements.redeem.studentLogin) elements.redeem.studentLogin.textContent = '';
  if (elements.redeem.studentUpdated) elements.redeem.studentUpdated.textContent = '';
  if (elements.redeem.studentBalance) elements.redeem.studentBalance.textContent = '0';
  if (elements.redeem.form) {
    elements.redeem.form.reset();
    setMessage(elements.redeem.formMessage, '', '');
  }
  setHistoryPlaceholder(elements.redeem.historyList);
  populateRedeemRewardsSelect();
}

function populateRedeemDetail(student) {
  if (!elements.redeem.detail) return;
  if (!student) {
    resetRedeemDetail();
    return;
  }

  elements.redeem.detail.dataset.empty = 'false';
  if (elements.redeem.detailContent) {
    elements.redeem.detailContent.hidden = false;
  }

  const displayName = student.displayName || student.loginName;
  if (elements.redeem.studentName) elements.redeem.studentName.textContent = displayName;
  if (elements.redeem.studentLogin) {
    elements.redeem.studentLogin.textContent = `登录名：${student.loginName}`;
  }
  if (elements.redeem.studentUpdated) {
    const fallback = student.updatedAt || '';
    const last = student.lastActivityAt || fallback;
    elements.redeem.studentUpdated.textContent = last
      ? `最近更新：${formatPointsDateLabel(last)}`
      : '暂无积分记录';
  }
  if (elements.redeem.studentBalance) {
    elements.redeem.studentBalance.textContent = student.pointsBalance;
  }
  if (elements.redeem.form) {
    elements.redeem.form.reset();
    setMessage(elements.redeem.formMessage, '', '');
  }
  populateRedeemRewardsSelect();
}

function populateRedeemRewardsSelect() {
  if (!elements.redeem.form) return;
  const select = elements.redeem.form.elements?.rewardId;
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
  if (!elements.redeem.form) return;
  try {
    const { rewards } = await fetchRewards();
    setRewards(rewards ?? []);
    populateRedeemRewardsSelect();
  } catch (error) {
    populateRedeemRewardsSelect();
    if (!silent && elements.redeem.message) {
      setMessage(elements.redeem.message, error.message, 'error');
    }
  }
}

async function loadRedeemHistory(studentId, { silent = false } = {}) {
  if (!studentId) {
    setRedeemHistory([]);
    setHistoryPlaceholder(elements.redeem.historyList);
    return;
  }
  try {
    const { entries } = await fetchStudentPointHistory(studentId);
    setRedeemHistory(entries ?? []);
    renderPointsHistory(elements.redeem.historyList, getRedeemHistory());
    if (!silent && elements.redeem.message) {
      setMessage(elements.redeem.message, TEXT.redeem.historyRefreshSuccess, 'success');
    }
  } catch (error) {
    if (elements.redeem.message) {
      setMessage(elements.redeem.message, error.message, 'error');
    }
  }
}

async function loadRedeemStudents({ silent = false, preserveSelection = false } = {}) {
  if (!elements.redeem.studentList) return;
  try {
    if (!silent && elements.redeem.message) {
      setMessage(elements.redeem.message, TEXT.redeem.loading, 'info');
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
    renderPointsStudentList(elements.redeem.studentList, list, activeId ?? null);

    await refreshRedeemRewards({ silent: true });

    if (activeId) {
      const current = list.find((student) => student.id === activeId);
      populateRedeemDetail(current);
      await loadRedeemHistory(activeId, { silent: true });
    } else {
      resetRedeemDetail();
      setRedeemHistory([]);
      setHistoryPlaceholder(elements.redeem.historyList);
    }

    if (!silent && elements.redeem.message) {
      setMessage(elements.redeem.message, TEXT.redeem.refreshSuccess, 'success');
    }
  } catch (error) {
    if (elements.redeem.message) {
      setMessage(elements.redeem.message, error.message, 'error');
    }
    resetRedeemDetail();
    setRedeemStudents([]);
    setRedeemHistory([]);
    setActiveRedeemStudentId(null);
    setHistoryPlaceholder(elements.redeem.historyList);
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
  renderPointsStudentList(elements.redeem.studentList, getRedeemStudents(), studentId);
  const current = getRedeemStudents().find((student) => student.id === studentId);
  populateRedeemDetail(current);
  loadRedeemHistory(studentId, { silent: true });
}

async function submitRedeemForm(event) {
  event.preventDefault();
  if (!elements.redeem.form) return;

  const studentId = getActiveRedeemStudentId();
  if (!studentId) {
    setMessage(elements.redeem.formMessage, TEXT.redeem.selectStudent, 'error');
    return;
  }

  const formData = new FormData(elements.redeem.form);
  const rewardId = Number.parseInt(formData.get('rewardId'), 10);
  if (!Number.isInteger(rewardId)) {
    setMessage(elements.redeem.formMessage, TEXT.redeem.noRewards, 'error');
    return;
  }

  const quantityValue = Number.parseInt(formData.get('quantity'), 10);
  const quantity = Number.isInteger(quantityValue) && quantityValue > 0 ? quantityValue : 1;
  const note = formData.get('note')?.trim();

  try {
    disableForm(elements.redeem.form, true);
    setMessage(elements.redeem.formMessage, TEXT.redeem.redeemInProgress, 'info');
    await redeemStudentReward(studentId, {
      rewardId,
      quantity,
      ...(note ? { note } : {})
    });
    setMessage(elements.redeem.formMessage, TEXT.redeem.redeemSuccess, 'success');
    elements.redeem.form.reset();
    await loadRedeemStudents({ silent: true, preserveSelection: true });
  } catch (error) {
    setMessage(elements.redeem.formMessage, error.message, 'error');
  } finally {
    disableForm(elements.redeem.form, false);
  }
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

function renderApprovals() {
  if (!elements.approval.list) return;
  const entries = getApprovals();
  updateApprovalDateLabel();
  renderApprovalList(elements.approval.list, entries, {
    onApprove: handleApproveEntry,
    onReject: handleRejectEntry,
    onDelete: handleDeleteEntry,
    onAward: handleAwardTask
  });
  if (elements.approval.message) {
    setMessage(elements.approval.message, '', '');
  }
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
    updateApprovalDateLabel(date);
    renderApprovals();
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


// ----- Navigation & lifecycle -----

async function changeView(view) {
  if (!view || view === getActiveView()) return;
  console.debug('[admin] changeView ->', view);
  showView(view);
  if (view === 'students') {
    await loadStudents();
  } else if (view === 'tasks') {
    await loadTasks();
  } else if (view === 'assignments') {
    await ensureAssignmentDependencies();
    await loadAssignments();
  } else if (view === 'approvals') {
    await loadApprovals({ silent: true });
  } else if (view === 'rewards') {
    await loadRewards({ silent: true });
  } else if (view === 'redeem') {
    await loadRedeemStudents({ silent: true });
  } else if (view === 'points') {
    await loadPointStudents({ silent: true });
  } else if (view === 'analytics') {
    await loadAnalytics({ silent: false });
  }
}

function setupNavigation() {
  if (elements.navContainer) {
    elements.navContainer.addEventListener('click', (event) => {
      const target = event.target.closest('[data-view]');
      if (!target || target.disabled) return;
      console.debug('[admin] nav click', target.dataset.view);
      changeView(target.dataset.view);
    });
  }

  if (elements.navTasks) {
    elements.navTasks.addEventListener('click', () => changeView('tasks'));
  }
  if (elements.navStudents) {
    elements.navStudents.addEventListener('click', () => changeView('students'));
  }
  if (elements.navAssignments) {
    elements.navAssignments.addEventListener('click', () => changeView('assignments'));
  }
  if (elements.navApprovals) {
    elements.navApprovals.addEventListener('click', () => changeView('approvals'));
  }
  if (elements.navRewards) {
    elements.navRewards.addEventListener('click', () => changeView('rewards'));
  }
  if (elements.navRedeem) {
    elements.navRedeem.addEventListener('click', () => changeView('redeem'));
  }
  if (elements.navPoints) {
    elements.navPoints.addEventListener('click', () => changeView('points'));
  }
  if (elements.navAnalytics) {
    elements.navAnalytics.addEventListener('click', () => changeView('analytics'));
  }
}

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

    const initialView = getActiveView();
    showView(initialView);
    if (initialView === 'students') {
      await loadStudents();
    } else if (initialView === 'assignments') {
      await ensureAssignmentDependencies();
      await loadAssignments();
    } else if (initialView === 'approvals') {
      await loadApprovals({ silent: true });
    } else if (initialView === 'rewards') {
      await loadRewards({ silent: true });
    } else if (initialView === 'redeem') {
      await loadRedeemStudents({ silent: true });
    } else if (initialView === 'points') {
      await loadPointStudents({ silent: true });
    } else if (initialView === 'analytics') {
      await loadAnalytics({ silent: false });
    } else {
      await loadTasks();
    }
  } catch (error) {
    window.location.href = '/';
  }
}

function main() {
  if (elements.addTaskBtn) {
    elements.addTaskBtn.addEventListener('click', () => openTaskModal('create'));
  }
  if (elements.addStudentBtn) {
    elements.addStudentBtn.addEventListener('click', () => openStudentModal('create'));
  }
  if (elements.addAssignmentBtn) {
    elements.addAssignmentBtn.addEventListener('click', handleAddAssignment);
  }
  if (elements.addRewardBtn) {
    elements.addRewardBtn.addEventListener('click', () => openRewardModal('create'));
  }
  if (elements.task.form) {
    elements.task.form.addEventListener('submit', submitTask);
  }
  if (elements.student.form) {
    elements.student.form.addEventListener('submit', submitStudent);
  }
  if (elements.assignment.form) {
    elements.assignment.form.addEventListener('submit', submitAssignment);
  }
  if (elements.reward.form) {
    elements.reward.form.addEventListener('submit', submitReward);
  }
  if (elements.points.studentList) {
    elements.points.studentList.addEventListener('click', handlePointsStudentClick);
  }
  if (elements.points.adjustForm) {
    elements.points.adjustForm.addEventListener('submit', submitPointsAdjust);
  }
  if (elements.points.refreshBtn) {
    elements.points.refreshBtn.addEventListener('click', () => loadPointStudents({ silent: false }));
  }
  if (elements.points.historyRefreshBtn) {
    elements.points.historyRefreshBtn.addEventListener('click', () => {
      const studentId = getActivePointsStudentId();
      if (!studentId) {
        setMessage(elements.points.message, TEXT.points.selectStudent, 'info');
        return;
      }
      loadPointsHistory(studentId, { silent: false });
    });
  }
  if (elements.redeem.studentList) {
    elements.redeem.studentList.addEventListener('click', handleRedeemStudentClick);
  }
  if (elements.redeem.form) {
    elements.redeem.form.addEventListener('submit', submitRedeemForm);
  }
  if (elements.redeem.refreshBtn) {
    elements.redeem.refreshBtn.addEventListener('click', () =>
      loadRedeemStudents({ silent: false })
    );
  }
  if (elements.redeem.historyRefreshBtn) {
    elements.redeem.historyRefreshBtn.addEventListener('click', () => {
      const studentId = getActiveRedeemStudentId();
      if (!studentId) {
        setMessage(elements.redeem.message, TEXT.redeem.selectStudent, 'info');
        return;
      }
      loadRedeemHistory(studentId, { silent: false });
    });
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

  setupModalInteractions();
  setupNavigation();
  bootstrap();
}

document.addEventListener('DOMContentLoaded', main);



