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
  logout
} from '../modules/apiClient.js';
import { qs, qsa, setMessage, disableForm, toggleHidden } from '../modules/dom.js';
import {
  getActiveView,
  getEditingStudentId,
  getEditingTaskId,
  getStudents,
  getTasks,
  setActiveView,
  setEditingStudentId,
  setEditingTaskId,
  setStudents,
  setTasks,
  setUser,
  getUser
} from './state.js';
import { populateTaskForm, readTaskForm, renderTaskList, resetTaskForm } from './tasks.js';
import { populateStudentForm, readStudentForm, renderStudentList, resetStudentForm } from './students.js';

const TEXT = {
  task: {
    modalCreateTitle: '新建任务',
    modalEditTitle: '编辑任务',
    loading: '正在加载任务...',
    deleteSuccess: '任务已删除。',
    saveInProgress: '正在保存...',
    updateSuccess: '任务已更新。',
    createSuccess: '任务创建成功。',
    titleRequired: '请填写任务标题',
    confirmDelete: (title) => `确认删除任务 “${title}” 吗？`
  },
  student: {
    modalCreateTitle: '添加学生',
    modalEditTitle: '编辑学生',
    loading: '正在加载学生账号...',
    deleteSuccess: '学生账号已删除。',
    saveInProgress: '正在保存账号信息...',
    updateSuccess: '学生账号已更新。',
    createSuccess: '学生账号创建成功。',
    fieldRequired: '请填写姓名和登录名',
    passwordRequired: '请为新学生设置登录密码',
    confirmDelete: (name) => `确认删除学生账号 “${name}” 吗？`
  }
};

const elements = {
  views: Array.from(document.querySelectorAll('.view')),
  navContainer: qs('.sidebar__nav'),
  addTaskBtn: qs('#addTaskBtn'),
  addStudentBtn: qs('#addStudentBtn'),
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
  avatar: {
    sidebar: qs('#sidebarAvatar'),
    topbar: qs('#topbarAvatar')
  },
  name: {
    sidebar: qs('#sidebarUserName'),
    topbar: qs('#topbarUserName')
  }
};

function navButtons() {
  return elements.navContainer ? qsa('[data-view]', elements.navContainer) : [];
}

function highlightNav(view) {
  navButtons().forEach((btn) => {
    if (btn.dataset.view === view) {
      btn.classList.add('nav-item--active');
    } else {
      btn.classList.remove('nav-item--active');
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
  const display = user.name || user.loginName || 'Parent';
  const initial = display.charAt(0).toUpperCase();
  elements.avatar.sidebar.textContent = initial;
  elements.avatar.topbar.textContent = initial;
  elements.name.sidebar.textContent = display;
  elements.name.topbar.textContent = display;
}

// ----- Task helpers -----
function setTaskModalMode(mode) {
  elements.task.modal.dataset.mode = mode;
  elements.task.title.textContent =
    mode === 'edit' ? TEXT.task.modalEditTitle : TEXT.task.modalCreateTitle;
}

function openTaskModal(mode, task = null) {
  setTaskModalMode(mode);
  setMessage(elements.task.formMessage, '', '');
  if (mode === 'edit' && task) {
    populateTaskForm(elements.task.form, task);
    setEditingTaskId(task.id);
  } else {
    resetTaskForm(elements.task.form);
    setEditingTaskId(null);
  }
  elements.task.modal.hidden = false;
}

function closeTaskModal() {
  elements.task.modal.hidden = true;
  resetTaskForm(elements.task.form);
  setEditingTaskId(null);
  setMessage(elements.task.formMessage, '', '');
}

async function loadTasks() {
  try {
    elements.task.list.innerHTML = `<p class="loading">${TEXT.task.loading}</p>`;
    const { tasks } = await fetchTasks();
    setTasks(tasks ?? []);
    renderTaskList(elements.task.list, getTasks(), {
      onEdit: handleEditTask,
      onDelete: handleDeleteTask
    });
  } catch (error) {
    elements.task.list.innerHTML = '';
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
  const answer = window.confirm(TEXT.task.confirmDelete(task.title));
  if (!answer) return;
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
    closeTaskModal();
    await loadTasks();
  } catch (error) {
    setMessage(elements.task.formMessage, error.message, 'error');
  } finally {
    disableForm(elements.task.form, false);
  }
}

// ----- Student helpers -----
function setStudentModalMode(mode) {
  elements.student.modal.dataset.mode = mode;
  elements.student.title.textContent =
    mode === 'edit' ? TEXT.student.modalEditTitle : TEXT.student.modalCreateTitle;
}

function openStudentModal(mode, student = null) {
  setStudentModalMode(mode);
  setMessage(elements.student.formMessage, '', '');
  if (mode === 'edit' && student) {
    populateStudentForm(elements.student.form, student);
    setEditingStudentId(student.id);
  } else {
    resetStudentForm(elements.student.form);
    setEditingStudentId(null);
  }
  elements.student.modal.hidden = false;
}

function closeStudentModal() {
  elements.student.modal.hidden = true;
  resetStudentForm(elements.student.form);
  setEditingStudentId(null);
  setMessage(elements.student.formMessage, '', '');
}

async function loadStudents() {
  try {
    elements.student.list.innerHTML = `<p class="loading">${TEXT.student.loading}</p>`;
    const { students } = await fetchStudents();
    setStudents(students ?? []);
    renderStudentList(elements.student.list, getStudents(), {
      onEdit: handleEditStudent,
      onDelete: handleDeleteStudent
    });
  } catch (error) {
    elements.student.list.innerHTML = '';
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
  const answer = window.confirm(TEXT.student.confirmDelete(name));
  if (!answer) return;
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
  const formValues = readStudentForm(elements.student.form);
  if (!formValues.name || !formValues.loginName) {
    setMessage(elements.student.formMessage, TEXT.student.fieldRequired, 'error');
    return;
  }

  const editingId = getEditingStudentId();
  const payload = {
    name: formValues.name,
    loginName: formValues.loginName
  };

  if (editingId) {
    if (formValues.password) {
      payload.password = formValues.password;
    }
  } else {
    if (!formValues.password) {
      setMessage(elements.student.formMessage, TEXT.student.passwordRequired, 'error');
      return;
    }
    payload.password = formValues.password;
  }

  try {
    disableForm(elements.student.form, true);
    setMessage(elements.student.formMessage, TEXT.student.saveInProgress, 'info');
    if (editingId) {
      await updateStudent(editingId, payload);
      setMessage(elements.student.message, TEXT.student.updateSuccess, 'success');
    } else {
      await createStudent(payload);
      setMessage(elements.student.message, TEXT.student.createSuccess, 'success');
    }
    closeStudentModal();
    await loadStudents();
  } catch (error) {
    setMessage(elements.student.formMessage, error.message, 'error');
  } finally {
    disableForm(elements.student.form, false);
  }
}

// ----- Event wiring -----
function setupNavigation() {
  if (!elements.navContainer) return;
  elements.navContainer.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-view]');
    if (!target || target.disabled) return;
    const view = target.dataset.view;
    if (!view || view === getActiveView()) return;

    showView(view);
    if (view === 'students') {
      await loadStudents();
    } else if (view === 'tasks') {
      await loadTasks();
    }
  });
}

function setupModalInteractions() {
  elements.task.cancelBtn?.addEventListener('click', closeTaskModal);
  elements.task.closeBtn?.addEventListener('click', closeTaskModal);
  elements.task.modal?.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'close-modal') {
      closeTaskModal();
    }
  });

  elements.student.cancelBtn?.addEventListener('click', closeStudentModal);
  elements.student.closeBtn?.addEventListener('click', closeStudentModal);
  elements.student.modal?.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'close-modal') {
      closeStudentModal();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!elements.task.modal.hidden) closeTaskModal();
      if (!elements.student.modal.hidden) closeStudentModal();
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
    } else {
      await loadTasks();
    }
  } catch (error) {
    window.location.href = '/';
  }
}

function main() {
  elements.addTaskBtn?.addEventListener('click', () => openTaskModal('create'));
  elements.addStudentBtn?.addEventListener('click', () => openStudentModal('create'));
  elements.task.form?.addEventListener('submit', submitTask);
  elements.student.form?.addEventListener('submit', submitStudent);
  elements.logoutButton?.addEventListener('click', handleLogout);

  setupModalInteractions();
  setupNavigation();
  bootstrap();
}

document.addEventListener('DOMContentLoaded', main);
