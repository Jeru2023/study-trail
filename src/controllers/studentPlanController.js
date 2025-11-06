import {
  getStudentDailyPlan,
  saveStudentDailyPlan,
  submitStudentDailyPlan
} from '../services/dailyPlanService.js';

function ensureStudentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'student') {
    res.status(403).json({ message: '没有权限' });
    return null;
  }
  return sessionUser;
}

function parsePlanDate(value) {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

function parseSubmitFlag(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === undefined || value === null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

function handlePlanError(res, error) {
  switch (error.message) {
    case 'INVALID_DATE':
      res.status(400).json({ message: '日期格式不正确' });
      return true;
    case 'STUDENT_NOT_FOUND':
    case 'PLAN_NOT_FOUND':
      res.status(404).json({ message: '未找到对应的学习计划' });
      return true;
    case 'PARENT_NOT_LINKED':
      res.status(400).json({ message: '未匹配到家长账号，无法创建计划' });
      return true;
    case 'PLAN_ITEMS_REQUIRED':
      res.status(400).json({ message: '至少需要添加一个子任务' });
      return true;
    case 'ITEM_TITLE_REQUIRED':
      res.status(400).json({ message: '子任务标题不能为空' });
      return true;
    case 'ITEM_TASK_REQUIRED':
      res.status(400).json({ message: '子任务必须关联一个任务' });
      return true;
    case 'TASK_NOT_ASSIGNED':
      res.status(400).json({ message: '存在未分配给您的任务，无法创建计划' });
      return true;
    case 'TASK_NOT_AVAILABLE':
      res.status(400).json({ message: '计划中存在今日不可执行的任务' });
      return true;
    case 'PLAN_LOCKED':
      res.status(409).json({ message: '计划已锁定，无法修改' });
      return true;
    case 'PLAN_IN_REVIEW':
      res.status(409).json({ message: '计划正在等待家长审核，暂时不能修改' });
      return true;
    case 'PLAN_ALREADY_SUBMITTED':
      res.status(409).json({ message: '计划已提交，请等待家长审核' });
      return true;
    default:
      return false;
  }
}

export async function fetchDailyPlan(req, res) {
  const sessionUser = ensureStudentSession(req, res);
  if (!sessionUser) return;

  try {
    const planDate = parsePlanDate(req.query.date);
    const result = await getStudentDailyPlan(sessionUser.id, planDate);
    res.json(result);
  } catch (error) {
    if (handlePlanError(res, error)) return;
    res.status(500).json({ message: '获取学习计划失败', detail: error.message });
  }
}

export async function saveDailyPlan(req, res) {
  const sessionUser = ensureStudentSession(req, res);
  if (!sessionUser) return;

  const { planDate, items, submit } = req.body ?? {};

  try {
    const plan = await saveStudentDailyPlan({
      studentId: sessionUser.id,
      planDate,
      items,
      submit: parseSubmitFlag(submit)
    });
    res.json({ plan });
  } catch (error) {
    if (handlePlanError(res, error)) return;
    res.status(500).json({ message: '保存学习计划失败', detail: error.message });
  }
}

export async function submitDailyPlan(req, res) {
  const sessionUser = ensureStudentSession(req, res);
  if (!sessionUser) return;

  const { planDate } = req.body ?? {};

  try {
    const plan = await submitStudentDailyPlan({
      studentId: sessionUser.id,
      planDate
    });
    res.json({ plan });
  } catch (error) {
    if (handlePlanError(res, error)) return;
    res.status(500).json({ message: '提交学习计划失败', detail: error.message });
  }
}
