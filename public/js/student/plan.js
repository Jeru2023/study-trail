import {
  fetchStudentDailyTasks,
  fetchStudentPlan,
  saveStudentPlan
} from '../modules/apiClient.js';
import { disableForm, setMessage, toggleHidden } from '../modules/dom.js';

const STATUS_LABELS = {
  draft: '草稿',
  submitted: '待审核',
  approved: '已通过',
  rejected: '已驳回'
};

const STATUS_HINTS = {
  draft: '请添加今日要完成的子任务，保存或提交给家长审批。',
  submitted: '计划已提交，等待家长审核。若需要调整，请耐心等待结果。',
  approved: '家长已通过今日计划，记得在完成后到“每日打卡”页提交成果。',
  rejected: '家长驳回了计划，请根据反馈调整后再次提交。'
};

const STATUS_BANNER = {
  submitted: '计划已发送给家长，请耐心等待审批结果。',
  approved: '家长通过了今日计划，可以前往“每日打卡”开始执行。',
  rejected: '家长驳回了该计划，请根据反馈调整后重新提交。'
};

const EDITABLE_STATUSES = new Set(['draft', 'rejected']);

function normalizePlanItem(item, index = 0) {
  const clientId =
    item.clientId || (item.id ? `plan-item-${item.id}` : `plan-item-${Date.now()}-${Math.random()}`);
  return {
    id: item.id ?? null,
    clientId,
    taskId: Number(item.taskId),
    title: item.title ?? '',
    sortOrder: Number.isInteger(item.sortOrder) ? item.sortOrder : index + 1
  };
}

export function createPlanController(globalState, elements, showGlobalMessage) {
  const planState = {
    status: 'draft',
    planDate: globalState.date,
    items: [],
    tasks: [],
    loading: false,
    rejectionReason: null,
    activeTaskId: null
  };

  function setPlanMessage(message, type = '') {
    if (!elements.message) return;
    setMessage(elements.message, message, type);
  }

  function syncGlobalPlan(plan) {
    globalState.plan = plan || null;
    globalState.planStatus = plan?.status || planState.status;
    if (typeof showGlobalMessage === 'function' && plan?.status === 'approved') {
      showGlobalMessage('家长已通过今日计划，记得按计划完成任务哦！', 'success');
    }
  }

  function getTaskById(taskId) {
    return planState.tasks.find((task) => task.taskId === taskId);
  }

  function getActiveTask() {
    if (!planState.activeTaskId) return null;
    return getTaskById(planState.activeTaskId) || null;
  }

  function getItemsForTask(taskId) {
    return planState.items.filter((item) => item.taskId === taskId);
  }

  function ensureActiveTask() {
    if (!planState.tasks.length) {
      planState.activeTaskId = null;
      return;
    }
    if (!planState.activeTaskId || !planState.tasks.some((task) => task.taskId === planState.activeTaskId)) {
      planState.activeTaskId = planState.tasks[0].taskId;
    }
  }

  function updateStatusBadge() {
    if (!elements.statusBadge) return;
    const status = planState.status;
    elements.statusBadge.dataset.status = status;
    elements.statusBadge.textContent = STATUS_LABELS[status] || STATUS_LABELS.draft;
  }

  function updateHintText() {
    if (!elements.hint) return;
    const status = planState.status;
    const baseMessage = STATUS_HINTS[status] || STATUS_HINTS.draft;
    if (status === 'rejected' && planState.rejectionReason) {
      elements.hint.textContent = `${baseMessage} 家长反馈：${planState.rejectionReason}`;
    } else {
      elements.hint.textContent = baseMessage;
    }
  }

  function updateBanner() {
    if (!elements.banner) return;
    const status = planState.status;
    const text = STATUS_BANNER[status];
    if (!text) {
      toggleHidden(elements.banner, true);
      elements.banner.textContent = '';
      delete elements.banner.dataset.status;
      return;
    }
    const reason = status === 'rejected' && planState.rejectionReason ? `\n家长备注：${planState.rejectionReason}` : '';
    elements.banner.textContent = `${text}${reason}`;
    elements.banner.dataset.status = status;
    toggleHidden(elements.banner, false);
  }

  function renderTabs() {
    if (!elements.tabs) return;
    elements.tabs.innerHTML = '';

    if (!planState.tasks.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'student-plan__tabs-empty';
      placeholder.textContent = '暂无可用任务，请联系家长分配后再创建计划。';
      elements.tabs.appendChild(placeholder);
      return;
    }

    planState.tasks.forEach((task, index) => {
      const count = getItemsForTask(task.taskId).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'student-plan__tab';
      button.dataset.taskId = String(task.taskId);
      button.setAttribute('role', 'tab');
      const isActive = planState.activeTaskId === task.taskId;
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
      button.dataset.active = isActive ? 'true' : 'false';
      button.textContent = task.title;

      if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'student-plan__tab-count';
        badge.textContent = count > 99 ? '99+' : String(count);
        button.appendChild(badge);
      }

      if (isActive) {
        button.classList.add('student-plan__tab--active');
      }
      if (index === 0) {
        button.dataset.first = 'true';
      }

      elements.tabs.appendChild(button);
    });
  }

  function updateEmptyState() {
    if (!elements.emptyHint || !elements.list) return;
    const activeTask = getActiveTask();
    const items = activeTask ? getItemsForTask(activeTask.taskId) : [];
    const isEmpty = !activeTask || items.length === 0;
    if (!activeTask) {
      elements.emptyHint.textContent = '当前暂无可用任务，请联系家长为你分配任务后再创建计划。';
    } else if (!items.length) {
      elements.emptyHint.textContent =
        planState.status === 'submitted'
          ? '计划已提交，等待家长审核。'
          : planState.status === 'approved'
          ? '计划已通过，如需调整请联系家长。'
          : planState.status === 'rejected'
          ? '家长驳回了该任务的计划，请重新添加子任务后提交。'
          : '还没有子任务，填写上方内容后点击“添加子任务”。';
    }
    toggleHidden(elements.emptyHint, !isEmpty);
    elements.list.hidden = isEmpty;
  }

  function createListItem(item, index) {
    const listItem = document.createElement('li');
    listItem.className = 'student-plan__item';
    listItem.dataset.itemId = item.clientId;

    const content = document.createElement('div');
    content.className = 'student-plan__item-content';

    const tag = document.createElement('span');
    tag.className = 'student-plan__item-task';
    const task = getTaskById(item.taskId);
    tag.textContent = task?.title || `任务 ${item.taskId}`;

    const title = document.createElement('p');
    title.className = 'student-plan__item-title';
    title.textContent = item.title;

    content.appendChild(tag);
    content.appendChild(title);
    listItem.appendChild(content);

    if (EDITABLE_STATUSES.has(planState.status)) {
      const actions = document.createElement('div');
      actions.className = 'student-plan__item-actions';
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'ghost-button ghost-button--danger student-plan__remove';
      removeButton.dataset.itemId = item.clientId;
      removeButton.textContent = '移除';
      actions.appendChild(removeButton);
      listItem.appendChild(actions);
    } else {
      listItem.classList.add('student-plan__item--readonly');
    }

    listItem.dataset.sortOrder = String(index + 1);
    return listItem;
  }

  function renderItems() {
    if (!elements.list) return;
    elements.list.innerHTML = '';
    const activeTask = getActiveTask();
    const items = activeTask ? getItemsForTask(activeTask.taskId) : [];
    items.forEach((item, index) => {
      elements.list.appendChild(createListItem(item, index));
    });
    updateEmptyState();
  }

  function setEditableState() {
    const statusEditable = EDITABLE_STATUSES.has(planState.status);
    const activeTask = getActiveTask();
    if (elements.planForm) {
      disableForm(elements.planForm, !statusEditable);
    }
    if (elements.titleInput) {
      elements.titleInput.disabled = !statusEditable || !activeTask;
    }
    if (elements.addButton) {
      elements.addButton.disabled = !statusEditable || !activeTask;
    }
    if (elements.submitButton) {
      if (!statusEditable && planState.status === 'submitted') {
        elements.submitButton.textContent = '等待家长审核';
      } else if (!statusEditable && planState.status === 'approved') {
        elements.submitButton.textContent = '家长已通过';
      } else {
        elements.submitButton.textContent = '提交家长审核';
      }
      elements.submitButton.disabled = !statusEditable;
    }
  }

  function setLoading(isLoading) {
    planState.loading = isLoading;
    if (elements.section) {
      elements.section.dataset.loading = isLoading ? 'true' : 'false';
    }
    const statusEditable = EDITABLE_STATUSES.has(planState.status);
    const disable = isLoading || !statusEditable;
    if (elements.planForm) {
      disableForm(elements.planForm, isLoading);
    }
    if (elements.titleInput) {
      elements.titleInput.disabled = disable || !getActiveTask();
    }
    if (elements.submitButton) {
      elements.submitButton.disabled = disable;
    }
    if (elements.addButton) {
      elements.addButton.disabled = disable || !getActiveTask();
    }
  }

  function applyPlan(plan) {
    const previousActiveTaskId = planState.activeTaskId;
    if (plan) {
      planState.status = plan.status || 'draft';
      planState.rejectionReason = plan.rejectionReason || null;
      planState.items = (plan.items || []).map((item, index) =>
        normalizePlanItem(
          {
            id: item.id,
            clientId: `plan-item-${item.id}`,
            taskId: item.taskId,
            title: item.title,
            sortOrder: item.sortOrder ?? index + 1
          },
          index
        )
      );
    } else {
      planState.status = 'draft';
      planState.rejectionReason = null;
      planState.items = [];
    }
    planState.activeTaskId = previousActiveTaskId;
    ensureActiveTask();

    updateStatusBadge();
    updateHintText();
    updateBanner();
    renderTabs();
    renderItems();
    setEditableState();
    syncGlobalPlan(plan);
    setPlanMessage('');
  }

  function appendNewItem({ taskId, title }) {
    const normalized = normalizePlanItem({ taskId, title }, planState.items.length);
    planState.items.push(normalized);
    renderItems();
  }

  function removeItemById(clientId) {
    planState.items = planState.items.filter((item) => item.clientId !== clientId);
    renderTabs();
    renderItems();
  }

  function readFormValues() {
    const activeTask = getActiveTask();
    const taskId = activeTask?.taskId ?? null;
    const title = elements.titleInput?.value?.trim() || '';
    return { taskId, title };
  }

  function resetForm() {
    if (elements.planForm) {
      elements.planForm.reset();
    }
    if (elements.titleInput) {
      elements.titleInput.value = '';
      elements.titleInput.focus();
    }
  }

  async function handleSubmitPlan() {
    if (planState.loading) return;
    const payload = {
      planDate: planState.planDate,
      items: planState.items.map((item, index) => ({
        taskId: item.taskId,
        title: item.title,
        sortOrder: index + 1
      })),
      submit: true
    };

    setPlanMessage('');
    setLoading(true);
    try {
      const { plan } = await saveStudentPlan(payload);
      applyPlan(plan);
      setPlanMessage('已提交学习计划，等待家长审核。', 'success');
    } catch (error) {
      const detail = error?.message;
      if (detail === 'Resource not found') {
        setPlanMessage('暂时无法提交计划，请确认服务已启动后重试。', 'error');
      } else {
        setPlanMessage(detail || '提交失败，请稍后再试。', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadPlan({ silent = false } = {}) {
    if (!silent) {
      setPlanMessage('');
    }
    setLoading(true);

    let taskResponse;
    let planResponse;
    let tasksError = null;
    let planError = null;

    try {
      taskResponse = await fetchStudentDailyTasks(globalState.date);
    } catch (error) {
      tasksError = error;
    }

    try {
      planResponse = await fetchStudentPlan(globalState.date);
    } catch (error) {
      planError = error;
    }

    planState.planDate = planResponse?.planDate || globalState.date;
    planState.tasks = (taskResponse?.tasks || []).map((task) => ({
      taskId: Number(task.taskId),
      title: task.title,
      points: Number.isFinite(task.points) ? task.points : 0
    }));
    ensureActiveTask();
    renderTabs();
    renderTabs();

    const safePlan = planResponse?.plan || null;
    applyPlan(safePlan);

    if (planError && planError.message === 'Resource not found') {
      planError = null;
    }

    if (tasksError) {
      const friendlyMessage =
        tasksError.message === 'Resource not found'
          ? '无法加载每日任务，请确认服务已更新后重试。'
          : tasksError.message;
      setPlanMessage(friendlyMessage || '无法加载每日任务，请稍后再试。', 'error');
    } else if (!planState.tasks.length) {
      setPlanMessage('暂无可用任务，请联系家长为你分配任务后再创建计划。', 'error');
    } else if (planError) {
      setPlanMessage(planError.message, 'error');
    }

    setLoading(false);
  }

  function registerEvents() {
    if (elements.tabs) {
      elements.tabs.addEventListener('click', (event) => {
        const trigger = event.target.closest('button[data-task-id]');
        if (!trigger) return;
        const taskId = Number.parseInt(trigger.dataset.taskId, 10);
        if (!Number.isInteger(taskId)) return;
        if (planState.activeTaskId === taskId) return;
        planState.activeTaskId = taskId;
        renderTabs();
        renderItems();
        setEditableState();
        setPlanMessage('');
      });
    }

    if (elements.planForm) {
      elements.planForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!EDITABLE_STATUSES.has(planState.status)) {
          return;
        }
        const { taskId, title } = readFormValues();
        if (!Number.isInteger(taskId) || taskId <= 0) {
          setPlanMessage('请先选择一个要计划的任务。', 'error');
          return;
        }
        if (!title) {
          setPlanMessage('请填写子任务内容。', 'error');
          return;
        }
        appendNewItem({ taskId, title });
        renderTabs();
        resetForm();
        setPlanMessage('已添加子任务，可以继续添加或保存计划。');
      });
    }

    if (elements.list) {
      elements.list.addEventListener('click', (event) => {
        const target = event.target.closest('button[data-item-id]');
        if (!target || !EDITABLE_STATUSES.has(planState.status)) {
          return;
        }
        const itemId = target.dataset.itemId;
        removeItemById(itemId);
        setPlanMessage('已移除子任务。');
      });
    }

    elements.submitButton?.addEventListener('click', (event) => {
      event.preventDefault();
      if (!getActiveTask()) {
        setPlanMessage('暂无可用任务，请联系家长分配后再提交计划。', 'error');
        return;
      }
      if (!planState.items.length) {
        setPlanMessage('请至少添加一个子任务后再提交。', 'error');
        return;
      }
      handleSubmitPlan();
    });
  }

  return {
    loadPlan,
    registerEvents,
    getStatus() {
      return planState.status;
    }
  };
}
