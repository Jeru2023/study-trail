import {
  completeStudentSubtask,
  createStudentSubtask,
  fetchStudentDailyTasks,
  getCurrentUser,
  logout,
  startStudentSubtask
} from '../modules/apiClient.js';
import { disableForm, qs, setMessage, toggleHidden } from '../modules/dom.js';

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE_MB = 10;

const state = {
  date: new Date().toISOString().slice(0, 10),
  tasks: [],
  student: null,
  completingEntry: null
};

const elements = {
  greeting: qs('#studentGreeting'),
  dateText: qs('#studentDateText'),
  logoutBtn: qs('#logoutStudentBtn'),
  container: qs('#taskContainer'),
  emptyHint: qs('#emptyHint'),
  pageMessage: qs('#studentPageMessage'),
  completeModal: qs('#completeModal'),
  completeForm: qs('#completeForm'),
  completeFormMessage: qs('#completeFormMessage'),
  completeTaskTitle: qs('#completeTaskTitle'),
  completeSubtaskTitle: qs('#completeSubtaskTitle'),
  completePhotos: qs('#completePhotos'),
  photoHint: qs('#photoHint'),
  cancelCompleteBtn: qs('#cancelCompleteBtn'),
  closeCompleteModalBtn: qs('#closeCompleteModal')
};

function formatDateLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

function parseDateTime(value) {
  if (!value) return null;
  return new Date(value.replace(' ', 'T'));
}

function formatTime(value) {
  const date = parseDateTime(value);
  if (!date) return '--';
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) {
    return '不到 1 分钟';
  }
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) {
    return `${hours} 小时 ${minutes} 分钟`;
  }
  if (hours) {
    return `${hours} 小时`;
  }
  return `${minutes} 分钟`;
}

function showPageMessage(text, type = '') {
  setMessage(elements.pageMessage, text, type);
}

function setLoading(flag) {
  if (flag) {
    showPageMessage('加载中...', 'info');
  }
}

function clearContainer() {
  while (elements.container.firstChild) {
    elements.container.removeChild(elements.container.firstChild);
  }
}

function createMetaItem(label, value) {
  const span = document.createElement('span');
  span.textContent = `${label}：${value}`;
  return span;
}

function updateSubtaskInState(entry) {
  const targetTask = state.tasks.find((task) => task.taskId === entry.taskId);
  if (!targetTask) {
    return;
  }
  const index = targetTask.subtasks.findIndex((item) => item.id === entry.id);
  if (index >= 0) {
    targetTask.subtasks[index] = entry;
  } else {
    targetTask.subtasks.push(entry);
  }
  targetTask.subtasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function renderSubtask(entry) {
  const item = document.createElement('li');
  item.className = 'subtask-item';
  item.dataset.entryId = entry.id;

  const header = document.createElement('div');
  header.className = 'subtask-header';

  const title = document.createElement('h3');
  title.className = 'subtask-title';
  title.textContent = entry.title;

  const status = document.createElement('span');
  status.className = 'status-badge';
  status.dataset.status = entry.status;
  status.textContent =
    entry.status === 'pending'
      ? '待开始'
      : entry.status === 'in_progress'
      ? '进行中'
      : '已完成';

  header.appendChild(title);
  header.appendChild(status);

  const meta = document.createElement('div');
  meta.className = 'subtask-meta';
  meta.appendChild(createMetaItem('开始时间', formatTime(entry.startedAt)));
  meta.appendChild(createMetaItem('结束时间', formatTime(entry.completedAt)));
  const durationValue = entry.status === 'completed' ? formatDuration(entry.durationSeconds) : '--';
  meta.appendChild(createMetaItem('耗时', durationValue));

  const body = document.createElement('div');
  body.className = 'subtask-body';

  const notes = entry.notes?.trim();
  if (notes) {
    const notesParagraph = document.createElement('p');
    notesParagraph.className = 'subtask-notes';
    notesParagraph.textContent = `感想：${notes}`;
    body.appendChild(notesParagraph);
  }

  if (entry.photos?.length) {
    const photoList = document.createElement('div');
    photoList.className = 'subtask-photos';
    entry.photos.forEach((photo, index) => {
      const link = document.createElement('a');
      link.href = photo.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `照片 ${index + 1}`;
      photoList.appendChild(link);
    });
    body.appendChild(photoList);
  }

  const actions = document.createElement('div');
  actions.className = 'subtask-actions';

  if (entry.status === 'pending') {
    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'primary-button';
    startBtn.dataset.action = 'start-subtask';
    startBtn.dataset.entryId = entry.id;
    startBtn.textContent = '开始打卡';
    actions.appendChild(startBtn);
  } else if (entry.status === 'in_progress') {
    const completeBtn = document.createElement('button');
    completeBtn.type = 'button';
    completeBtn.className = 'primary-button';
    completeBtn.dataset.action = 'complete-subtask';
    completeBtn.dataset.entryId = entry.id;
    completeBtn.textContent = '完成提交';
    actions.appendChild(completeBtn);
  } else if (entry.status === 'completed' && !entry.photos?.length) {
    const addPhotoBtn = document.createElement('button');
    addPhotoBtn.type = 'button';
    addPhotoBtn.className = 'ghost-button';
    addPhotoBtn.dataset.action = 'complete-subtask';
    addPhotoBtn.dataset.entryId = entry.id;
    addPhotoBtn.textContent = '补充照片';
    actions.appendChild(addPhotoBtn);
  }

  item.appendChild(header);
  item.appendChild(meta);
  if (body.childNodes.length) {
    item.appendChild(body);
  }
  if (actions.childNodes.length) {
    item.appendChild(actions);
  }

  return item;
}

function renderTask(task) {
  const card = document.createElement('article');
  card.className = 'task-card';
  card.dataset.taskId = task.taskId;

  const header = document.createElement('div');
  header.className = 'task-card__header';

  const title = document.createElement('h2');
  title.className = 'task-card__title';
  title.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'task-card__meta';
  meta.appendChild(createMetaItem('积分', task.points));
  if (task.startDate || task.endDate) {
    const range = `${task.startDate ?? '无'} 至 ${task.endDate ?? '无'}`;
    meta.appendChild(createMetaItem('有效期', range));
  }

  header.appendChild(title);
  header.appendChild(meta);

  card.appendChild(header);

  if (task.description) {
    const description = document.createElement('p');
    description.className = 'task-card__description';
    description.textContent = task.description;
    card.appendChild(description);
  }

  const list = document.createElement('ul');
  list.className = 'subtask-list';

  if (!task.subtasks.length) {
    const empty = document.createElement('li');
    empty.className = 'subtask-empty';
    empty.textContent = '还没有子任务，先添加一个小目标吧～';
    list.appendChild(empty);
  } else {
    task.subtasks.forEach((entry) => {
      list.appendChild(renderSubtask(entry));
    });
  }

  const form = document.createElement('form');
  form.className = 'subtask-form';
  form.dataset.taskId = task.taskId;

  const fields = document.createElement('div');
  fields.className = 'subtask-form__fields';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.name = 'title';
  titleInput.placeholder = '记录一个要完成的小任务，例如：阅读《小王子》第一章';
  titleInput.required = true;
  titleInput.maxLength = 180;

  const notesInput = document.createElement('textarea');
  notesInput.name = 'notes';
  notesInput.placeholder = '（可选）想补充的说明？';
  notesInput.rows = 2;

  fields.appendChild(titleInput);
  fields.appendChild(notesInput);

  const actions = document.createElement('div');
  actions.className = 'subtask-form__actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'primary-button';
  submitBtn.textContent = '添加子任务';

  actions.appendChild(submitBtn);

  form.appendChild(fields);
  form.appendChild(actions);

  card.appendChild(list);
  card.appendChild(form);

  return card;
}

function renderTasks() {
  clearContainer();
  toggleHidden(elements.emptyHint, state.tasks.length !== 0);

  state.tasks.forEach((task) => {
    const card = renderTask(task);
    elements.container.appendChild(card);
  });

  if (!state.tasks.length) {
    toggleHidden(elements.emptyHint, false);
  }
}

function updateDateHeader() {
  elements.dateText.textContent = formatDateLabel(state.date);
}

async function loadTasks() {
  setLoading(true);
  try {
    const { tasks } = await fetchStudentDailyTasks(state.date);
    state.tasks = tasks;
    renderTasks();
    if (!tasks.length) {
      showPageMessage('今日暂无待完成的任务～', 'info');
    } else {
      showPageMessage('', '');
    }
  } catch (error) {
    state.tasks = [];
    renderTasks();
    showPageMessage(error.message, 'error');
  } finally {
    setLoading(false);
  }
}

async function handleSubtaskFormSubmit(event) {
  if (!event.target.matches('.subtask-form')) return;
  event.preventDefault();

  const form = event.target;
  const taskId = Number.parseInt(form.dataset.taskId, 10);
  const titleInput = form.elements.title;
  const notesInput = form.elements.notes;
  const title = titleInput.value.trim();
  const notes = notesInput.value.trim();

  if (!title) {
    showPageMessage('请先填写子任务内容。', 'error');
    titleInput.focus();
    return;
  }

  try {
    disableForm(form, true);
    const { entry } = await createStudentSubtask(taskId, {
      title,
      notes: notes || undefined,
      entryDate: state.date
    });
    updateSubtaskInState(entry);
    renderTasks();
    showPageMessage('已添加子任务，开始行动吧！', 'success');
  } catch (error) {
    showPageMessage(error.message, 'error');
  } finally {
    disableForm(form, false);
    form.reset();
  }
}

async function handleStartSubtask(entryId) {
  try {
    const { entry } = await startStudentSubtask(entryId);
    updateSubtaskInState(entry);
    renderTasks();
    showPageMessage('开始计时，加油！', 'success');
  } catch (error) {
    showPageMessage(error.message, 'error');
  }
}

function openCompleteModal(entry) {
  state.completingEntry = entry;
  const parentTask = state.tasks.find((task) => task.taskId === entry.taskId);
  elements.completeTaskTitle.textContent = parentTask ? parentTask.title : '完成打卡';
  elements.completeSubtaskTitle.textContent = `${entry.title}（开始于 ${formatTime(
    entry.startedAt
  )}）`;
  elements.completeForm.reset();
  const remaining = Math.max(0, MAX_PHOTOS - (entry.photos?.length || 0));
  elements.completePhotos.disabled = remaining === 0;
  elements.photoHint.textContent =
    remaining === 0
      ? '照片数量已达上限，如需调整请联系家长或老师。'
      : `还能上传 ${remaining} 张，每张不超过 ${MAX_FILE_SIZE_MB}MB。`;
  setMessage(elements.completeFormMessage, '', '');
  elements.completeModal.hidden = false;
}

function closeCompleteModal() {
  state.completingEntry = null;
  elements.completeModal.hidden = true;
  setMessage(elements.completeFormMessage, '', '');
  if (elements.completeForm) {
    elements.completeForm.reset();
  }
}

async function handleCompleteFormSubmit(event) {
  event.preventDefault();
  if (!state.completingEntry) return;

  const entry = state.completingEntry;
  const formData = new FormData();
  const notes = elements.completeForm.elements.notes.value.trim();
  if (notes) {
    formData.append('notes', notes);
  }

  const files = elements.completePhotos?.files ? Array.from(elements.completePhotos.files) : [];
  const remaining = Math.max(0, MAX_PHOTOS - (entry.photos?.length || 0));

  if (files.length > remaining) {
    setMessage(
      elements.completeFormMessage,
      `还能上传 ${remaining} 张照片，请调整后再试。`,
      'error'
    );
    return;
  }

  const oversize = files.find((file) => file.size > MAX_FILE_SIZE_MB * 1024 * 1024);
  if (oversize) {
    setMessage(elements.completeFormMessage, '存在超过大小限制的照片，请重新选择。', 'error');
    return;
  }

  files.forEach((file) => {
    formData.append('photos', file);
  });

  try {
    disableForm(elements.completeForm, true);
    const { entry: updated } = await completeStudentSubtask(entry.id, formData);
    updateSubtaskInState(updated);
    renderTasks();
    closeCompleteModal();
    showPageMessage('棒极了，任务已完成！', 'success');
  } catch (error) {
    setMessage(elements.completeFormMessage, error.message, 'error');
  } finally {
    disableForm(elements.completeForm, false);
  }
}

function handleTaskContainerClick(event) {
  const action = event.target.closest('[data-action]');
  if (!action) return;

  const entryId = Number.parseInt(action.dataset.entryId, 10);
  if (!Number.isFinite(entryId)) return;

  const task = state.tasks.find((t) => t.subtasks.some((subtask) => subtask.id === entryId));
  if (!task) return;

  const entry = task.subtasks.find((subtask) => subtask.id === entryId);
  if (!entry) return;

  if (action.dataset.action === 'start-subtask') {
    handleStartSubtask(entryId);
  } else if (action.dataset.action === 'complete-subtask') {
    openCompleteModal(entry);
  }
}

function registerEvents() {
  elements.container?.addEventListener('submit', handleSubtaskFormSubmit);
  elements.container?.addEventListener('click', handleTaskContainerClick);

  elements.logoutBtn?.addEventListener('click', async () => {
    try {
      await logout();
    } finally {
      window.location.href = '/';
    }
  });

  elements.completeForm?.addEventListener('submit', handleCompleteFormSubmit);
  elements.cancelCompleteBtn?.addEventListener('click', closeCompleteModal);
  elements.closeCompleteModalBtn?.addEventListener('click', closeCompleteModal);

  elements.completeModal?.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'close-modal') {
      closeCompleteModal();
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
    elements.greeting.textContent = displayName
      ? `${displayName}，今日打卡`
      : '今日打卡';
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
  loadTasks();
}

document.addEventListener('DOMContentLoaded', bootstrap);
