import {
  createTask,
  deleteTask,
  findTaskById,
  listScheduleOverrides,
  listTasksByParent,
  updateTask,
  upsertScheduleOverride,
  deleteScheduleOverride
} from '../services/taskService.js';

const RESPONSE_TEXT = {
  forbidden: '\u6ca1\u6709\u6743\u9650',
  fetchFailed: '\u83b7\u53d6\u4efb\u52a1\u5931\u8d25',
  notFound: '\u4efb\u52a1\u4e0d\u5b58\u5728',
  titleRequired: '\u4efb\u52a1\u6807\u9898\u4e0d\u80fd\u4e3a\u7a7a',
  pointsRequired: '\u8bf7\u586b\u5199\u4efb\u52a1\u79ef\u5206',
  pointsInvalid: '\u4efb\u52a1\u79ef\u5206\u5fc5\u987b\u662f\u5927\u4e8e\u7b49\u4e8e 0 \u7684\u6574\u6570',
  dateInvalid: '\u65e5\u671f\u683c\u5f0f\u4e0d\u6b63\u786e',
  dateRangeInvalid: '\u7ed3\u675f\u65e5\u671f\u5fc5\u987b\u665a\u4e8e\u5f00\u59cb\u65e5\u671f',
  createFailed: '\u521b\u5efa\u4efb\u52a1\u5931\u8d25',
  updateFailed: '\u66f4\u65b0\u4efb\u52a1\u5931\u8d25',
  deleteFailed: '\u5220\u9664\u4efb\u52a1\u5931\u8d25',
  scheduleInvalid: '\u8bf7\u9009\u62e9\u6b63\u786e\u7684\u4efb\u52a1\u5468\u671f',
  overrideDateInvalid: '\u8bf7\u586b\u5165\u6b63\u786e\u7684\u65e5\u671f',
  overrideRangeInvalid: '\u7ed3\u675f\u65e5\u671f\u5fc5\u987b\u665a\u4e8e\u6216\u7b49\u4e8e\u5f00\u59cb\u65e5\u671f'
};

const ALLOWED_SCHEDULE_TYPES = new Set(['weekday', 'holiday']);

function ensureParentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'parent') {
    res.status(403).json({ message: RESPONSE_TEXT.forbidden });
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
    res.status(500).json({ message: RESPONSE_TEXT.fetchFailed, detail: error.message });
  }
}

export async function getTask(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const task = await findTaskById(sessionUser.id, Number(req.params.taskId));
    if (!task) {
      return res.status(404).json({ message: RESPONSE_TEXT.notFound });
    }
    return res.json({ task });
  } catch (error) {
    return res.status(500).json({ message: RESPONSE_TEXT.fetchFailed, detail: error.message });
  }
}

function normalizeScheduleType(input) {
  if (input === undefined || input === null || input === '') {
    return 'weekday';
  }
  const normalized = String(input).trim().toLowerCase();
  if (!ALLOWED_SCHEDULE_TYPES.has(normalized)) {
    throw new Error('INVALID_SCHEDULE_TYPE');
  }
  return normalized;
}

function parseTaskPayload(body) {
  const title = body.title?.trim();
  const description = body.description?.trim() || null;
  const startDate = body.startDate ? new Date(body.startDate) : null;
  const endDate = body.endDate ? new Date(body.endDate) : null;
  const pointsRaw = body.points;

  if (!title) {
    throw new Error('TITLE_REQUIRED');
  }

  if (pointsRaw === undefined || pointsRaw === null || pointsRaw === '') {
    throw new Error('POINTS_REQUIRED');
  }

  const points = Number.parseInt(String(pointsRaw).trim(), 10);
  if (Number.isNaN(points) || points < 0) {
    throw new Error('POINTS_INVALID');
  }

  const payload = {
    title,
    description,
    points,
    scheduleType: normalizeScheduleType(body.scheduleType ?? body.schedule_type)
  };

  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new Error('INVALID_START_DATE');
  }
  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new Error('INVALID_END_DATE');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new Error('DATE_RANGE_INVALID');
  }

  payload.startDate = startDate ? startDate.toISOString().slice(0, 10) : null;
  payload.endDate = endDate ? endDate.toISOString().slice(0, 10) : null;

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
      return res.status(400).json({ message: RESPONSE_TEXT.titleRequired });
    }
    if (error.message === 'POINTS_REQUIRED') {
      return res.status(400).json({ message: RESPONSE_TEXT.pointsRequired });
    }
    if (error.message === 'POINTS_INVALID') {
      return res.status(400).json({ message: RESPONSE_TEXT.pointsInvalid });
    }
    if (error.message === 'INVALID_SCHEDULE_TYPE') {
      return res.status(400).json({ message: RESPONSE_TEXT.scheduleInvalid });
    }
    if (error.message === 'INVALID_START_DATE' || error.message === 'INVALID_END_DATE') {
      return res.status(400).json({ message: RESPONSE_TEXT.dateInvalid });
    }
    if (error.message === 'DATE_RANGE_INVALID') {
      return res.status(400).json({ message: RESPONSE_TEXT.dateRangeInvalid });
    }
    return res.status(500).json({ message: RESPONSE_TEXT.createFailed, detail: error.message });
  }
}

export async function updateTaskHandler(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const taskId = Number(req.params.taskId);
    const existing = await findTaskById(sessionUser.id, taskId);
    if (!existing) {
      return res.status(404).json({ message: RESPONSE_TEXT.notFound });
    }

    const payload = parseTaskPayload(req.body);
    const task = await updateTask(sessionUser.id, taskId, payload);
    return res.json({ task });
  } catch (error) {
    if (error.message === 'TITLE_REQUIRED') {
      return res.status(400).json({ message: RESPONSE_TEXT.titleRequired });
    }
    if (error.message === 'POINTS_REQUIRED') {
      return res.status(400).json({ message: RESPONSE_TEXT.pointsRequired });
    }
    if (error.message === 'POINTS_INVALID') {
      return res.status(400).json({ message: RESPONSE_TEXT.pointsInvalid });
    }
    if (error.message === 'INVALID_SCHEDULE_TYPE') {
      return res.status(400).json({ message: RESPONSE_TEXT.scheduleInvalid });
    }
    if (error.message === 'INVALID_START_DATE' || error.message === 'INVALID_END_DATE') {
      return res.status(400).json({ message: RESPONSE_TEXT.dateInvalid });
    }
    if (error.message === 'DATE_RANGE_INVALID') {
      return res.status(400).json({ message: RESPONSE_TEXT.dateRangeInvalid });
    }
    return res.status(500).json({ message: RESPONSE_TEXT.updateFailed, detail: error.message });
  }
}

export async function listScheduleOverridesHandler(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const overrides = await listScheduleOverrides(sessionUser.id);
    res.json({ overrides });
  } catch (error) {
    res.status(500).json({ message: RESPONSE_TEXT.fetchFailed, detail: error.message });
  }
}

export async function upsertScheduleOverrideHandler(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const { startDate, endDate, scheduleType, schedule_type: snakeSchedule, note } = req.body ?? {};
    const normalizedType = normalizeScheduleType(scheduleType ?? snakeSchedule);
    const trimmedNote = note?.trim() || null;

    const override = await upsertScheduleOverride(sessionUser.id, {
      startDate,
      endDate,
      scheduleType: normalizedType,
      note: trimmedNote
    });
    res.status(200).json({ override });
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      return res.status(400).json({ message: RESPONSE_TEXT.overrideDateInvalid });
    }
    if (error.message === 'INVALID_SCHEDULE_TYPE') {
      return res.status(400).json({ message: RESPONSE_TEXT.scheduleInvalid });
    }
    if (error.message === 'INVALID_RANGE') {
      return res.status(400).json({ message: RESPONSE_TEXT.overrideRangeInvalid });
    }
    return res.status(500).json({ message: RESPONSE_TEXT.updateFailed, detail: error.message });
  }
}

export async function deleteScheduleOverrideHandler(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const overrideId = Number.parseInt(req.params.overrideId, 10);
    if (!Number.isInteger(overrideId) || overrideId <= 0) {
      return res.status(404).json({ message: RESPONSE_TEXT.notFound });
    }
    const removed = await deleteScheduleOverride(sessionUser.id, overrideId);
    if (!removed) {
      return res.status(404).json({ message: RESPONSE_TEXT.notFound });
    }
    return res.status(204).end();
  } catch (error) {
    return res.status(500).json({ message: RESPONSE_TEXT.deleteFailed, detail: error.message });
  }
}

export async function deleteTaskHandler(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const taskId = Number(req.params.taskId);
    const ok = await deleteTask(sessionUser.id, taskId);
    if (!ok) {
      return res.status(404).json({ message: RESPONSE_TEXT.notFound });
    }
    return res.status(204).end();
  } catch (error) {
    return res.status(500).json({ message: RESPONSE_TEXT.deleteFailed, detail: error.message });
  }
}
