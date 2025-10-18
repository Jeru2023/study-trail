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
  logout
} from '../modules/apiClient.js';
import { qs, qsa, setMessage, disableForm, toggleHidden } from '../modules/dom.js';
import {
  getActiveView,
  getEditingStudentId,
  getEditingTaskId,
  getEditingAssignmentStudentId,
  getStudents,
  getTasks,
  getAssignments,
  setActiveView,
  setEditingStudentId,
  setEditingTaskId,
  setEditingAssignmentStudentId,
  setStudents,
  setTasks,
  setAssignments,
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

const TEXT = {
  task: {
    modalCreateTitle: '新增任务',
    modalEditTitle: '编辑任务',
    loading: '正在加载任务...',
    deleteSuccess: '任务已删除',
    saveInProgress: '正在保存...',
    updateSuccess: '任务已更新',
    createSuccess: '任务创建成功',
    titleRequired: '请填写任务标题',
    pointsInvalid: '请填写有效的任务积分',
    confirmDelete: (title) => `确认删除任务 “${title}” 吗？`
  },
  student: {
    modalCreateTitle: '添加学生',
    modalEditTitle: '编辑学生',
    loading: '正在加载学生账号...',
    deleteSuccess: '学生账号已删除',
    saveInProgress: '正在保存账号信息...',
    updateSuccess: '学生账号已更新',
    createSuccess: '学生账号创建成功',
    fieldRequired: '请填写姓名和登录名',
    passwordRequired: '请为新学生设置登录密码',
    confirmDelete: (name) => `确认删除学生账号 “${name}” 吗？`
  },
  assignment: {
    modalCreateTitle: '添加关联',
    modalEditTitle: '编辑关联',
    loading: '正在加载任务关联...',
    saveInProgress: '正在保存关联...',
    saveSuccess: '任务关联已保存',
    deleteSuccess: '任务关联已清除',
    studentRequired: '请选择学生',
    taskRequired: '请至少选择一项打卡任务',
    noStudents: '请先创建学生账号',
    noTasks: '请先创建打卡任务',
    confirmDelete: (name) => `确认清除学生 “${name}” 的全部关联吗？`
  }
};

const elements = {
  views: Array.from(document.querySelectorAll('.view')),
  navContainer: qs('.sidebar__nav'),
  navTasks: qs('#navTasks'),
  navStudents: qs('#navStudents'),
  navAssignments: qs('#navAssignments'),
  addTaskBtn: qs('#addTaskBtn'),
  addStudentBtn: qs('#addStudentBtn'),
  addAssignmentBtn: qs('#addAssignmentBtn'),
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
  const name = assignment?.student?.name || assignment?.student?.loginName || '该学生';
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
  if (elements.task.form) {
    elements.task.form.addEventListener('submit', submitTask);
  }
  if (elements.student.form) {
    elements.student.form.addEventListener('submit', submitStudent);
  }
  if (elements.assignment.form) {
    elements.assignment.form.addEventListener('submit', submitAssignment);
  }
  if (elements.logoutButton) {
    elements.logoutButton.addEventListener('click', handleLogout);
  }

  setupModalInteractions();
  setupNavigation();
  bootstrap();
}

document.addEventListener('DOMContentLoaded', main);
