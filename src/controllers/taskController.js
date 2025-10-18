import {
  createTask,
  deleteTask,
  findTaskById,
  listTasksByParent,
  updateTask
} from '../services/taskService.js';

function ensureParentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'parent') {
    res.status(403).json({ message: '没有权限' });
    return null;
  }
  return sessionUser;
}

export async function listTasks(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const tasks = await listTasksByParent(sessionUser.id);
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: '获取任务失败', detail: error.message });
  }
}

export async function getTask(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const task = await findTaskById(sessionUser.id, Number(req.params.taskId));
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }
    return res.json({ task });
  } catch (error) {
    return res.status(500).json({ message: '获取任务失败', detail: error.message });
  }
}

function parseTaskPayload(body) {
  const title = body.title?.trim();
  const description = body.description?.trim() || null;
  const startDate = body.startDate ? new Date(body.startDate) : null;
  const endDate = body.endDate ? new Date(body.endDate) : null;

  if (!title) {
    throw new Error('TITLE_REQUIRED');
  }

  const payload = { title, description };

  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new Error('INVALID_START_DATE');
  }
  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new Error('INVALID_END_DATE');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new Error('DATE_RANGE_INVALID');
  }

  if (startDate) {
    payload.startDate = startDate.toISOString().slice(0, 10);
  } else {
    payload.startDate = null;
  }
  if (endDate) {
    payload.endDate = endDate.toISOString().slice(0, 10);
  } else {
    payload.endDate = null;
  }

  return payload;
}

export async function createTaskHandler(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const payload = parseTaskPayload(req.body);
    const task = await createTask(sessionUser.id, payload);
    res.status(201).json({ task });
  } catch (error) {
    if (error.message === 'TITLE_REQUIRED') {
      return res.status(400).json({ message: '任务标题不能为空' });
    }
    if (error.message === 'INVALID_START_DATE' || error.message === 'INVALID_END_DATE') {
      return res.status(400).json({ message: '日期格式不正确' });
    }
    if (error.message === 'DATE_RANGE_INVALID') {
      return res.status(400).json({ message: '结束日期必须晚于开始日期' });
    }
    return res.status(500).json({ message: '创建任务失败', detail: error.message });
  }
}

export async function updateTaskHandler(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const taskId = Number(req.params.taskId);
    const existing = await findTaskById(sessionUser.id, taskId);
    if (!existing) {
      return res.status(404).json({ message: '任务不存在' });
    }

    const payload = parseTaskPayload(req.body);
    const task = await updateTask(sessionUser.id, taskId, payload);
    return res.json({ task });
  } catch (error) {
    if (error.message === 'TITLE_REQUIRED') {
      return res.status(400).json({ message: '任务标题不能为空' });
    }
    if (error.message === 'INVALID_START_DATE' || error.message === 'INVALID_END_DATE') {
      return res.status(400).json({ message: '日期格式不正确' });
    }
    if (error.message === 'DATE_RANGE_INVALID') {
      return res.status(400).json({ message: '结束日期必须晚于开始日期' });
    }
    return res.status(500).json({ message: '更新任务失败', detail: error.message });
  }
}

export async function deleteTaskHandler(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const taskId = Number(req.params.taskId);
    const ok = await deleteTask(sessionUser.id, taskId);
    if (!ok) {
      return res.status(404).json({ message: '任务不存在' });
    }
    return res.status(204).end();
  } catch (error) {
    return res.status(500).json({ message: '删除任务失败', detail: error.message });
  }
}
