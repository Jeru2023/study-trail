import {
  completeStudentSubtask,
  createStudentSubtask,
  fetchStudentDailyTasks,
  getCurrentUser,
  logout,
  startStudentSubtask
} from '../modules/apiClient.js';
import { disableForm, qs, setMessage, toggleHidden } from '../modules/dom.js';

const MAX_PROOFS = 6;
const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const state = {
  date: new Date().toISOString().slice(0, 10),
  tasks: [],
  student: null,
  completingEntry: null,
  previewUrls: [],
  remainingCapacity: MAX_PROOFS
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
  proofInput: qs('#proofInput'),
  uploadDropzone: qs('#uploadDropzone'),
  uploadPreview: qs('#uploadPreview'),
  proofHint: qs('#proofHint'),
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
  while (elements.container?.firstChild) {
    elements.container.removeChild(elements.container.firstChild);
  }
}

function createMetaItem(label, value) {
  const span = document.createElement('span');
  span.textContent = `${label}：${value}`;
  return span;
}

function getProofs(entry) {
  return entry.proofs ?? entry.photos ?? [];
}

function normalizeEntry(entry) {
  const proofs = getProofs(entry);
  entry.proofs = proofs;
  entry.photos = proofs;
  return entry;
}

function normalizeTasks(tasks) {
  return tasks.map((task) => ({
    ...task,
    subtasks: task.subtasks.map((subtask) => normalizeEntry(subtask))
  }));
}

function updateSubtaskInState(entry) {
  const normalized = normalizeEntry(entry);
  const targetTask = state.tasks.find((task) => task.taskId === normalized.taskId);
  if (!targetTask) {
    return;
  }
  const index = targetTask.subtasks.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    targetTask.subtasks[index] = normalized;
  } else {
    targetTask.subtasks.push(normalized);
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

  const proofs = getProofs(entry);
  if (proofs.length) {
    const assetList = document.createElement('div');
    assetList.className = 'subtask-assets';

    proofs.forEach((proof, index) => {
      const link = document.createElement('a');
      link.href = proof.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'subtask-assets__item';
      link.title = proof.originalName || `附件 ${index + 1}`;

      if (proof.type === 'video') {
        const video = document.createElement('video');
        video.src = proof.url;
        video.controls = true;
        video.muted = true;
        video.preload = 'metadata';
        video.playsInline = true;
        link.appendChild(video);

        const badge = document.createElement('span');
        badge.className = 'subtask-assets__badge';
        badge.textContent = '视频';
        link.appendChild(badge);
      } else {
        const image = document.createElement('img');
        image.src = proof.url;
        image.alt = proof.originalName || `照片 ${index + 1}`;
        link.appendChild(image);
      }

      assetList.appendChild(link);
    });

    body.appendChild(assetList);
  }

  const actions = document.createElement('div');
  actions.className = 'subtask-actions';
  const proofCount = proofs.length;

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
  } else if (entry.status === 'completed' && proofCount < MAX_PROOFS) {
    const addProofBtn = document.createElement('button');
    addProofBtn.type = 'button';
    addProofBtn.className = 'ghost-button';
    addProofBtn.dataset.action = 'complete-subtask';
    addProofBtn.dataset.entryId = entry.id;
    addProofBtn.textContent = proofCount ? '补充证明' : '补充照片/视频';
    actions.appendChild(addProofBtn);
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
    elements.container?.appendChild(card);
  });

  if (!state.tasks.length) {
    toggleHidden(elements.emptyHint, false);
  }
}

function updateDateHeader() {
  elements.dateText.textContent = formatDateLabel(state.date);
}

function getExistingProofCount(entry) {
  return getProofs(entry).length;
}

function updateProofHint(remaining) {
  if (!elements.proofHint) return;
  elements.proofHint.textContent =
    remaining === 0
      ? '文件数量已达到上限，如需调整请联系家长或老师。'
      : `还能上传 ${remaining} 个文件，每个不超过 ${MAX_FILE_SIZE_MB}MB。`;
}

function setProofInputAvailability(remaining) {
  state.remainingCapacity = remaining;
  const disabled = remaining === 0;
  if (elements.proofInput) {
    elements.proofInput.disabled = disabled;
    if (disabled) {
      elements.proofInput.value = '';
    }
  }
  if (elements.uploadDropzone) {
    elements.uploadDropzone.classList.toggle('upload-dropzone--disabled', disabled);
    elements.uploadDropzone.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }
  updateProofHint(remaining);
}

function clearPreview() {
  state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
  state.previewUrls = [];
  if (elements.uploadPreview) {
    elements.uploadPreview.innerHTML = '';
  }
}

function renderSelectedProofs(fileList) {
  clearPreview();
  if (!fileList?.length || !elements.uploadPreview) {
    return;
  }

  const fragment = document.createDocumentFragment();

  Array.from(fileList).forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'upload-preview__item';

    const objectUrl = URL.createObjectURL(file);
    state.previewUrls.push(objectUrl);

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = objectUrl;
      video.controls = true;
      video.muted = true;
      video.preload = 'metadata';
      video.playsInline = true;
      item.appendChild(video);

      const badge = document.createElement('span');
      badge.className = 'upload-preview__badge';
      badge.textContent = '视频';
      item.appendChild(badge);
    } else {
      const image = document.createElement('img');
      image.src = objectUrl;
      image.alt = file.name || `预览 ${index + 1}`;
      item.appendChild(image);
    }

    fragment.appendChild(item);
  });

  elements.uploadPreview.appendChild(fragment);
}

function handleProofSelection(fileList) {
  if (!state.completingEntry || !fileList) {
    return;
  }

  if (fileList.length > state.remainingCapacity) {
    setMessage(
      elements.completeFormMessage,
      `还能上传 ${state.remainingCapacity} 个文件，请重新选择。`,
      'error'
    );
    if (elements.proofInput) {
      elements.proofInput.value = '';
    }
    clearPreview();
    return;
  }

  const oversize = Array.from(fileList).find((file) => file.size > MAX_FILE_SIZE_BYTES);
  if (oversize) {
    setMessage(
      elements.completeFormMessage,
      `存在超过 ${MAX_FILE_SIZE_MB}MB 的文件，请重新选择。`,
      'error'
    );
    if (elements.proofInput) {
      elements.proofInput.value = '';
    }
    clearPreview();
    return;
  }

  setMessage(elements.completeFormMessage, '', '');
  renderSelectedProofs(fileList);
}

async function loadTasks() {
  setLoading(true);
  try {
    const { tasks } = await fetchStudentDailyTasks(state.date);
    state.tasks = normalizeTasks(tasks);
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
  elements.completeTaskTitle.textContent = entry.title;
  const startedAt = formatTime(entry.startedAt);
  elements.completeSubtaskTitle.textContent = `任务开始于 ${startedAt}`;

  if (elements.completeForm) {
    elements.completeForm.reset();
  }
  if (elements.proofInput) {
    elements.proofInput.value = '';
  }
  clearPreview();
  setMessage(elements.completeFormMessage, '', '');

  const remaining = Math.max(0, MAX_PROOFS - getExistingProofCount(entry));
  setProofInputAvailability(remaining);

  elements.completeModal.hidden = false;
}

function closeCompleteModal() {
  state.completingEntry = null;
  setProofInputAvailability(MAX_PROOFS);
  clearPreview();
  if (elements.proofInput) {
    elements.proofInput.value = '';
  }
  if (elements.completeForm) {
    elements.completeForm.reset();
  }
  setMessage(elements.completeFormMessage, '', '');
  elements.completeModal.hidden = true;
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

  const files = elements.proofInput?.files ? Array.from(elements.proofInput.files) : [];
  if (files.length > state.remainingCapacity) {
    setMessage(
      elements.completeFormMessage,
      `还能上传 ${state.remainingCapacity} 个文件，请调整后再试。`,
      'error'
    );
    return;
  }

  const oversize = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
  if (oversize) {
    setMessage(
      elements.completeFormMessage,
      `存在超过 ${MAX_FILE_SIZE_MB}MB 的文件，请重新选择。`,
      'error'
    );
    return;
  }

  files.forEach((file) => {
    formData.append('proofs', file);
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

  elements.proofInput?.addEventListener('change', (event) => {
    handleProofSelection(event.target.files);
  });

  if (elements.uploadDropzone) {
    const openPicker = () => {
      if (!elements.proofInput?.disabled) {
        elements.proofInput.click();
      }
    };

    elements.uploadDropzone.addEventListener('click', openPicker);
    elements.uploadDropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPicker();
      }
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      elements.uploadDropzone.addEventListener(eventName, (event) => {
        if (elements.proofInput?.disabled) return;
        event.preventDefault();
        elements.uploadDropzone.classList.add('upload-dropzone--dragover');
      });
    });

    ['dragleave', 'dragend'].forEach((eventName) => {
      elements.uploadDropzone.addEventListener(eventName, () => {
        elements.uploadDropzone.classList.remove('upload-dropzone--dragover');
      });
    });

    elements.uploadDropzone.addEventListener('drop', (event) => {
      if (elements.proofInput?.disabled) return;
      event.preventDefault();
      elements.uploadDropzone.classList.remove('upload-dropzone--dragover');
      const droppedFiles = event.dataTransfer?.files;
      if (!droppedFiles || droppedFiles.length === 0) {
        return;
      }
      const dataTransfer = new DataTransfer();
      Array.from(droppedFiles).forEach((file) => {
        dataTransfer.items.add(file);
      });
      if (dataTransfer.files.length) {
        elements.proofInput.files = dataTransfer.files;
        handleProofSelection(dataTransfer.files);
      }
    });
  }
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
    elements.greeting.textContent = displayName ? `${displayName}，今日打卡` : '今日打卡';
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
