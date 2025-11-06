import { fetchStudentDailyTasks, startStudentSubtask, completeStudentSubtask } from '../modules/apiClient.js';
import { disableForm, setMessage, toggleHidden } from '../modules/dom.js';

const MAX_PROOFS = 6;
const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function formatTime(value) {
  if (!value) return '--';
  const normalized = value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
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

function formatReviewStatus(status) {
  const REVIEW_STATUS_TEXT = {
    pending: '等待家长审批',
    approved: '家长已通过',
    rejected: '被驳回，请重新完成该任务'
  };
  return REVIEW_STATUS_TEXT[status] || REVIEW_STATUS_TEXT.pending;
}

export function createTaskController(state, elements, showPageMessage) {
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
    const reviewStatus = entry.reviewStatus || 'pending';
    meta.appendChild(createMetaItem('开始时间', formatTime(entry.startedAt)));
    meta.appendChild(createMetaItem('结束时间', formatTime(entry.completedAt)));
    const durationValue = entry.status === 'completed' ? formatDuration(entry.durationSeconds) : '--';
    meta.appendChild(createMetaItem('耗时', durationValue));
    meta.appendChild(createMetaItem('审批状态', formatReviewStatus(reviewStatus)));

    const body = document.createElement('div');
    body.className = 'subtask-body';

    if (reviewStatus === 'rejected') {
      const reviewWarning = document.createElement('p');
      reviewWarning.className = 'subtask-review-warning';
      reviewWarning.textContent = entry.reviewNotes
        ? `家长备注：${entry.reviewNotes}`
        : '家长已驳回，请重新完成该子任务。';
      body.appendChild(reviewWarning);
    }

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
    } else if (entry.status === 'completed' && entry.reviewStatus !== 'approved' && proofCount < MAX_PROOFS) {
      const addProofBtn = document.createElement('button');
      addProofBtn.type = 'button';
      addProofBtn.className = 'ghost-button';
      addProofBtn.dataset.action = 'complete-subtask';
      addProofBtn.dataset.entryId = entry.id;
      addProofBtn.textContent = proofCount ? '补充证明' : '补充照片/视频';
      actions.appendChild(addProofBtn);
    }

    const list = document.createElement('div');
    list.appendChild(header);
    list.appendChild(meta);
    if (body.childNodes.length) {
      list.appendChild(body);
    }
    if (actions.childNodes.length) {
      list.appendChild(actions);
    }

    item.appendChild(list);
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
    header.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'task-card__meta';
    meta.appendChild(createMetaItem('积分', task.points));
    if (task.startDate || task.endDate) {
      const range = `${task.startDate ?? '无'} 至 ${task.endDate ?? '无'}`;
      meta.appendChild(createMetaItem('有效期', range));
    }

    if (task.description) {
      const description = document.createElement('p');
      description.className = 'task-card__description';
      description.textContent = task.description;
      card.appendChild(description);
    }

    card.appendChild(header);
    card.appendChild(header);
    card.appendChild(meta);

    if (!task.subtasks.length) {
      const empty = document.createElement('p');
      empty.className = 'subtask-empty';
      empty.textContent = '今日计划中暂无该任务的子任务，请先查看每日计划。';
      card.appendChild(empty);
    } else {
      const list = document.createElement('ul');
      list.className = 'subtask-list';
      task.subtasks.forEach((entry) => {
        list.appendChild(renderSubtask(entry));
      });
      card.appendChild(list);
    }

    return card;
  }

  function renderTasks() {
    clearContainer();
    const hasTasks = state.tasks.length > 0;
    if (!hasTasks) {
      if (elements.emptyHint) {
        let message = '今日暂无待完成的任务，继续保持哦～';
        const status = state.planStatus;
        if (status === 'draft') {
          message = '请先在“每日计划”中制定今日计划，再来完成打卡。';
        } else if (status === 'submitted') {
          message = '每日计划正在等待家长审批，请稍后再来打卡。';
        } else if (status === 'rejected') {
          message = '每日计划被驳回，请先根据反馈调整后重新提交。';
        }
        elements.emptyHint.textContent = message;
        toggleHidden(elements.emptyHint, false);
      }
      return;
    }

    toggleHidden(elements.emptyHint, true);
    state.tasks.forEach((task) => {
      elements.container?.appendChild(renderTask(task));
    });
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
    if (!elements.uploadPreview) return;
    elements.uploadPreview.innerHTML = '';
    state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    state.previewUrls = [];
  }

  function handleProofSelection(fileList) {
    if (!fileList || !elements.uploadPreview) return;
    clearPreview();

    const files = Array.from(fileList);
    const remaining = Math.max(0, MAX_PROOFS - getProofs(state.completingEntry || {}).length);
    if (files.length > remaining) {
      setMessage(
        elements.completeFormMessage,
        `还能上传 ${remaining} 个文件，请调整后再试。`,
        'error'
      );
      if (elements.proofInput) {
        elements.proofInput.value = '';
      }
      return;
    }

    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      state.previewUrls.push(url);
      const preview = document.createElement('div');
      preview.className = 'upload-preview__item';
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.muted = true;
        video.playsInline = true;
        preview.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = url;
        img.alt = file.name;
        preview.appendChild(img);
      }
      elements.uploadPreview.appendChild(preview);
    });

    setProofInputAvailability(remaining - files.length);
  }

  function openCompleteModal(entry) {
    state.completingEntry = entry;
    elements.completeTaskTitle.textContent = entry.title;
    elements.completeSubtaskTitle.textContent = `任务开始于 ${formatTime(entry.startedAt)}`;

    if (elements.completeForm) {
      elements.completeForm.reset();
    }
    if (elements.proofInput) {
      elements.proofInput.value = '';
    }
    clearPreview();
    setMessage(elements.completeFormMessage, '', '');

    const remaining = Math.max(0, MAX_PROOFS - getProofs(entry).length);
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

  async function loadTasks() {
    try {
      const { tasks } = await fetchStudentDailyTasks(state.date);
      state.tasks = normalizeTasks(tasks ?? []);
      renderTasks();
      if (!state.tasks.length) {
        const status = state.planStatus;
        if (status === 'draft') {
          showPageMessage('请先完成“每日计划”后再来打卡。', 'info');
        } else if (status === 'submitted') {
          showPageMessage('每日计划正在等待家长审批，请稍后再试。', 'info');
        } else if (status === 'rejected') {
          showPageMessage('每日计划被驳回，请先根据家长反馈调整计划。', 'error');
        } else {
          showPageMessage('今日暂无待完成的任务～', 'info');
        }
        return;
      }
      showPageMessage('', '');
    } catch (error) {
      state.tasks = [];
      renderTasks();
      showPageMessage(error.message, 'error');
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
    const existingProofs = getProofs(state.completingEntry || {}).length;
    const maxAttachments = Math.max(0, MAX_PROOFS - existingProofs);

    if (files.length > maxAttachments) {
      setMessage(
        elements.completeFormMessage,
        `还能上传 ${maxAttachments} 个文件，请调整后再试。`,
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
    elements.container?.addEventListener('click', handleTaskContainerClick);

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

  return {
    loadTasks,
    registerEvents
  };
}
