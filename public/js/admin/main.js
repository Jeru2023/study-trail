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
import { qs, setMessage, disableForm, toggleHidden } from '../modules/dom.js';
import {
  getActiveView,
  getEditingStudentId,
  getEditingTaskId,
  getStudents,
  getTasks,
  getUser,
  setActiveView,
  setEditingStudentId,
  setEditingTaskId,
  setStudents,
  setTasks,
  setUser
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

const views = Array.from(document.querySelectorAll('.view'));
const pageMessageTasks = qs('#taskMessage');
const pageMessageStudents = qs('#studentMessage');
const taskListContainer = qs('#taskList');
const studentListContainer = qs('#studentList');

const addTaskBtn = qs('#addTaskBtn');
const addStudentBtn = qs('#addStudentBtn');
const logoutButton = qs('#logoutButton');
const navTasks = qs('#navTasks');
const navStudents = qs('#navStudents');

// Task modal elements
const taskModal = qs('#taskModal');
const taskModalTitle = qs('#taskModalTitle');
const taskForm = qs('#taskForm');
const taskFormMessage = qs('#taskFormMessage');
const cancelTaskBtn = qs('#cancelTaskBtn');
const closeTaskModalBtn = qs('#closeTaskModal');

// Student modal elements
const studentModal = qs('#studentModal');
const studentModalTitle = qs('#studentModalTitle');
const studentForm = qs('#studentForm');
const studentFormMessage = qs('#studentFormMessage');
const cancelStudentBtn = qs('#cancelStudentBtn');
const closeStudentModalBtn = qs('#closeStudentModal');

// User display
const sidebarAvatar = qs('#sidebarAvatar');
const topbarAvatar = qs('#topbarAvatar');
const sidebarUserName = qs('#sidebarUserName');
const topbarUserName = qs('#topbarUserName');

function updateUserDisplay(user) {
  if (!user) return;
  const display = user.name || user.loginName || 'Parent';
  const initial = display.charAt(0).toUpperCase();
  sidebarAvatar.textContent = initial;
  topbarAvatar.textContent = initial;
  sidebarUserName.textContent = display;
  topbarUserName.textContent = display;
}

// ---------- View management ----------
function highlightNav(view) {
  [navTasks, navStudents].forEach((btn) => {
    if (!btn) return;
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

  views.forEach((section) => {
    const match = section.dataset.view === view;
    toggleHidden(section, !match);
  });
}

// ---------- Task handling ----------
function setTaskModalMode(mode) {
  taskModal.dataset.mode = mode;
  taskModalTitle.textContent =
    mode === 'edit' ? TEXT.task.modalEditTitle : TEXT.task.modalCreateTitle;
}

function openTaskModal(mode, task = null) {
  setTaskModalMode(mode);
  setMessage(taskFormMessage, '', '');
  if (mode === 'edit' && task) {
    populateTaskForm(taskForm, task);
    setEditingTaskId(task.id);
  } else {
    resetTaskForm(taskForm);
    setEditingTaskId(null);
  }
  taskModal.hidden = false;
}

function closeTaskModal() {
  taskModal.hidden = true;
  resetTaskForm(taskForm);
  setEditingTaskId(null);
  setMessage(taskFormMessage, '', '');
}

async function loadTasks() {
  try {
    taskListContainer.innerHTML = `<p class="loading">${TEXT.task.loading}</p>`;
    const { tasks } = await fetchTasks();
    setTasks(tasks ?? []);
    renderTaskList(taskListContainer, getTasks(), {
      onEdit: handleEditTask,
      onDelete: handleDeleteTask
    });
  } catch (error) {
    taskListContainer.innerHTML = '';
    setMessage(pageMessageTasks, error.message, 'error');
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
    setMessage(pageMessageTasks, TEXT.task.deleteSuccess, 'success');
    await loadTasks();
  } catch (error) {
    setMessage(pageMessageTasks, error.message, 'error');
  }
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  const payload = readTaskForm(taskForm);

  if (!payload.title) {
    setMessage(taskFormMessage, TEXT.task.titleRequired, 'error');
    return;
  }

  try {
    disableForm(taskForm, true);
    setMessage(taskFormMessage, TEXT.task.saveInProgress, 'info');
    const editingId = getEditingTaskId();

    if (editingId) {
      await updateTask(editingId, payload);
      setMessage(pageMessageTasks, TEXT.task.updateSuccess, 'success');
    } else {
      await createTask(payload);
      setMessage(pageMessageTasks, TEXT.task.createSuccess, 'success');
    }

    closeTaskModal();
    await loadTasks();
  } catch (error) {
    setMessage(taskFormMessage, error.message, 'error');
  } finally {
    disableForm(taskForm, false);
  }
}

// ---------- Student handling ----------
function setStudentModalMode(mode) {
  studentModal.dataset.mode = mode;
  studentModalTitle.textContent =
    mode === 'edit' ? TEXT.student.modalEditTitle : TEXT.student.modalCreateTitle;
}

function openStudentModal(mode, student = null) {
  setStudentModalMode(mode);
  setMessage(studentFormMessage, '', '');
  if (mode === 'edit' && student) {
    populateStudentForm(studentForm, student);
    setEditingStudentId(student.id);
  } else {
    resetStudentForm(studentForm);
    setEditingStudentId(null);
  }
  studentModal.hidden = false;
}

function closeStudentModal() {
  studentModal.hidden = true;
  resetStudentForm(studentForm);
  setEditingStudentId(null);
  setMessage(studentFormMessage, '', '');
}

async function loadStudents() {
  try {
    studentListContainer.innerHTML = `<p class="loading">${TEXT.student.loading}</p>`;
    const { students } = await fetchStudents();
    setStudents(students ?? []);
    renderStudentList(studentListContainer, getStudents(), {
      onEdit: handleEditStudent,
      onDelete: handleDeleteStudent
    });
  } catch (error) {
    studentListContainer.innerHTML = '';
    setMessage(pageMessageStudents, error.message, 'error');
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
  const answer = window.confirm(TEXT.student.confirmDelete(student.name || student.loginName));
  if (!answer) return;
  try {
    await removeStudent(studentId);
    setMessage(pageMessageStudents, TEXT.student.deleteSuccess, 'success');
    await loadStudents();
  } catch (error) {
    setMessage(pageMessageStudents, error.message, 'error');
  }
}

async function handleStudentSubmit(event) {
  event.preventDefault();
  const payload = readStudentForm(studentForm);
  if (!payload.name || !payload.loginName) {
    setMessage(studentFormMessage, TEXT.student.fieldRequired, 'error');
    return;
  }

  const editingId = getEditingStudentId();
  const submitPayload = {
    name: payload.name,
    loginName: payload.loginName
  };

  if (editingId) {
    if (payload.password) {
      submitPayload.password = payload.password;
    }
  } else {
    if (!payload.password) {
      setMessage(studentFormMessage, TEXT.student.passwordRequired, 'error');
      return;
    }
    submitPayload.password = payload.password;
  }

  try {
    disableForm(studentForm, true);
    setMessage(studentFormMessage, TEXT.student.saveInProgress, 'info');
    if (editingId) {
      await updateStudent(editingId, submitPayload);
      setMessage(pageMessageStudents, TEXT.student.updateSuccess, 'success');
    } else {
      await createStudent(submitPayload);
      setMessage(pageMessageStudents, TEXT.student.createSuccess, 'success');
    }

    closeStudentModal();
    await loadStudents();
  } catch (error) {
    setMessage(studentFormMessage, error.message, 'error');
  } finally {
    disableForm(studentForm, false);
  }
}

// ---------- Event wiring ----------
function setupModalInteractions() {
  cancelTaskBtn.addEventListener('click', closeTaskModal);
  closeTaskModalBtn.addEventListener('click', closeTaskModal);
  taskModal.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'close-modal') {
      closeTaskModal();
    }
  });

  cancelStudentBtn.addEventListener('click', closeStudentModal);
  closeStudentModalBtn.addEventListener('click', closeStudentModal);
  studentModal.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'close-modal') {
      closeStudentModal();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!taskModal.hidden) {
        closeTaskModal();
      }
      if (!studentModal.hidden) {
        closeStudentModal();
      }
    }
  });
}

function setupNavigation() {
  navTasks.addEventListener('click', async () => {
    showView('tasks');
    await loadTasks();
  });

  navStudents.addEventListener('click', async () => {
    showView('students');
    await loadStudents();
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
  addTaskBtn.addEventListener('click', () => openTaskModal('create'));
  addStudentBtn.addEventListener('click', () => openStudentModal('create'));
  taskForm.addEventListener('submit', handleTaskSubmit);
  studentForm.addEventListener('submit', handleStudentSubmit);
  logoutButton.addEventListener('click', handleLogout);

  setupModalInteractions();
  setupNavigation();
  bootstrap();
}

document.addEventListener('DOMContentLoaded', main);
