import { config } from '../config.js';
import {
  completeSubtaskEntry,
  createSubtaskEntry,
  listDailyTasksForStudent,
  startSubtaskEntry
} from '../services/studentDailyTaskService.js';

function ensureStudentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'student') {
    res.status(403).json({ message: '没有权限' });
    return null;
  }
  return sessionUser;
}

function parseDateQuery(value) {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

export async function getDailyTasks(req, res) {
  const sessionUser = ensureStudentSession(req, res);
  if (!sessionUser) return;

  try {
    const dateQuery = parseDateQuery(req.query.date);
    const result = await listDailyTasksForStudent(sessionUser.id, dateQuery);
    res.json(result);
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      res.status(400).json({ message: '日期格式不正确' });
      return;
    }
    res.status(500).json({ message: '获取任务失败', detail: error.message });
  }
}

export async function addSubtask(req, res) {
  const sessionUser = ensureStudentSession(req, res);
  if (!sessionUser) return;

  const taskId = Number.parseInt(String(req.params.taskId).trim(), 10);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    res.status(400).json({ message: '任务 ID 不合法' });
    return;
  }

  const { title, notes, entryDate } = req.body;

  try {
    const entry = await createSubtaskEntry({
      studentId: sessionUser.id,
      taskId,
      entryDate,
      title,
      notes
    });
    res.status(201).json({ entry });
  } catch (error) {
    if (error.message === 'TITLE_REQUIRED') {
      res.status(400).json({ message: '请填写子任务标题' });
      return;
    }
    if (error.message === 'INVALID_DATE') {
      res.status(400).json({ message: '日期格式不正确' });
      return;
    }
    if (error.message === 'ASSIGNMENT_NOT_FOUND') {
      res.status(404).json({ message: '未找到对应任务' });
      return;
    }
    if (error.message === 'TASK_DATE_OUT_OF_RANGE') {
      res.status(400).json({ message: '该任务今日不可打卡' });
      return;
    }
    if (error.message === 'DAY_PLAN_LOCKED') {
      res
        .status(409)
        .json({ message: '今日该任务的子任务计划已锁定，无法新增子任务' });
      return;
    }
    res.status(500).json({ message: '创建子任务失败', detail: error.message });
  }
}

export async function startSubtask(req, res) {
  const sessionUser = ensureStudentSession(req, res);
  if (!sessionUser) return;

  const entryId = Number.parseInt(String(req.params.entryId).trim(), 10);
  if (!Number.isInteger(entryId) || entryId <= 0) {
    res.status(400).json({ message: '子任务 ID 不合法' });
    return;
  }

  try {
    const entry = await startSubtaskEntry({
      entryId,
      studentId: sessionUser.id
    });
    res.json({ entry });
  } catch (error) {
    if (error.message === 'ENTRY_NOT_FOUND') {
      res.status(404).json({ message: '未找到子任务' });
      return;
    }
    if (error.message === 'ENTRY_ALREADY_COMPLETED') {
      res.status(409).json({ message: '子任务已完成' });
      return;
    }
    res.status(500).json({ message: '开始打卡失败', detail: error.message });
  }
}

export async function completeSubtask(req, res) {
  const sessionUser = ensureStudentSession(req, res);
  if (!sessionUser) return;

  const entryId = Number.parseInt(String(req.params.entryId).trim(), 10);
  if (!Number.isInteger(entryId) || entryId <= 0) {
    res.status(400).json({ message: '子任务 ID 不合法' });
    return;
  }

  try {
    const entry = await completeSubtaskEntry({
      entryId,
      studentId: sessionUser.id,
      notes: req.body?.notes,
      files: req.files
    });
    res.json({ entry });
  } catch (error) {
    if (error.message === 'ENTRY_NOT_FOUND') {
      res.status(404).json({ message: '未找到子任务' });
      return;
    }
    if (error.message === 'PHOTO_LIMIT_EXCEEDED') {
      res.status(400).json({
        message: `上传文件数量超出限制，每次最多 ${config.uploads.maxPhotosPerEntry} 个文件`
      });
      return;
    }
    if (error.message === 'DAY_PLAN_EMPTY') {
      res.status(400).json({ message: '请先创建子任务后再提交' });
      return;
    }
    res.status(500).json({ message: '提交打卡失败', detail: error.message });
  }
}
