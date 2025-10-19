import { getCurrentUser, logout } from '../modules/apiClient.js';
import { qs, setMessage, toggleHidden } from '../modules/dom.js';
import { createTaskController } from './tasks.js';
import { createStoreController } from './store.js';

const state = {
  date: new Date().toISOString().slice(0, 10),
  activeView: 'tasks',
  tasks: [],
  rewards: [],
  student: null,
  completingEntry: null,
  previewUrls: [],
  remainingCapacity: 6,
  storeLoaded: false
};

const elements = {
  greeting: qs('#studentGreeting'),
  dateText: qs('#studentDateHeading'),
  headerTitle: qs('#studentHeaderTitle'),
  logoutBtn: qs('#logoutStudentBtn'),
  navTasks: qs('#studentNavTasks'),
  navStore: qs('#studentNavStore'),
  views: Array.from(document.querySelectorAll('.student-view')),
  pageMessage: qs('#studentPageMessage')
};

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

function formatDateLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

function showPageMessage(text, type = '') {
  setMessage(elements.pageMessage, text, type);
}

function getActiveView() {
  return state.activeView;
}

function highlightNav(view) {
  [elements.navTasks, elements.navStore].forEach((button) => {
    if (!button) return;
    const active = button.dataset.view === view;
    button.classList.toggle('student-nav__item--active', active);
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
  elements.headerTitle.textContent = view === 'store' ? '积分商城' : '每日任务';
}

function updateDateHeader() {
  if (!elements.dateText) return;
  elements.dateText.textContent = formatDateLabel(state.date);
}

async function changeView(view) {
  if (!view || view === getActiveView()) return;
  state.activeView = view;
  updateHeaderTitle(view);
  showView(view);
  if (view === 'store') {
    await storeController.loadStore({ silent: state.storeLoaded });
  }
}

function registerEvents() {
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
  registerEvents();
  if (!(await ensureStudentSession())) {
    return;
  }
  updateDateHeader();
  updateHeaderTitle(getActiveView());
  showView(getActiveView());
  await taskController.loadTasks();
  await storeController.loadStore({ silent: true });
}

document.addEventListener('DOMContentLoaded', bootstrap);
