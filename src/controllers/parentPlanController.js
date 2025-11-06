import {
  listParentDailyPlans,
  getParentDailyPlan,
  approveDailyPlan,
  rejectDailyPlan
} from '../services/dailyPlanService.js';

function ensureParentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'parent') {
    res.status(403).json({ message: '没有权限' });
    return null;
  }
  return sessionUser;
}

function parseStatusQuery(value) {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

function handleParentPlanError(res, error) {
  switch (error.message) {
    case 'INVALID_STATUS':
      res.status(400).json({ message: '状态过滤条件不正确' });
      return true;
    case 'PLAN_NOT_FOUND':
      res.status(404).json({ message: '未找到该学习计划' });
      return true;
    case 'PLAN_NOT_SUBMITTED':
      res.status(409).json({ message: '该计划尚未提交，无法审批' });
      return true;
    case 'PLAN_ALREADY_APPROVED':
      res.status(409).json({ message: '该计划已经批准' });
      return true;
    default:
      return false;
  }
}

export async function listDailyPlans(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const status = parseStatusQuery(req.query.status);
    const plans = await listParentDailyPlans({
      parentId: sessionUser.id,
      status
    });
    res.json({ plans });
  } catch (error) {
    if (handleParentPlanError(res, error)) return;
    res.status(500).json({ message: '获取学习计划列表失败', detail: error.message });
  }
}

export async function getDailyPlanDetail(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const planId = Number.parseInt(String(req.params.planId).trim(), 10);
  if (!Number.isInteger(planId) || planId <= 0) {
    res.status(400).json({ message: '学习计划 ID 不合法' });
    return;
  }

  try {
    const plan = await getParentDailyPlan({
      parentId: sessionUser.id,
      planId
    });
    res.json({ plan });
  } catch (error) {
    if (handleParentPlanError(res, error)) return;
    res.status(500).json({ message: '获取学习计划详情失败', detail: error.message });
  }
}

export async function approvePlan(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const planId = Number.parseInt(String(req.params.planId).trim(), 10);
  if (!Number.isInteger(planId) || planId <= 0) {
    res.status(400).json({ message: '学习计划 ID 不合法' });
    return;
  }

  try {
    const plan = await approveDailyPlan({
      parentId: sessionUser.id,
      planId
    });
    res.json({ plan });
  } catch (error) {
    if (handleParentPlanError(res, error)) return;
    res.status(500).json({ message: '批准学习计划失败', detail: error.message });
  }
}

export async function rejectPlan(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const planId = Number.parseInt(String(req.params.planId).trim(), 10);
  if (!Number.isInteger(planId) || planId <= 0) {
    res.status(400).json({ message: '学习计划 ID 不合法' });
    return;
  }

  try {
    const plan = await rejectDailyPlan({
      parentId: sessionUser.id,
      planId,
      reason: req.body?.reason
    });
    res.json({ plan });
  } catch (error) {
    if (handleParentPlanError(res, error)) return;
    res.status(500).json({ message: '驳回学习计划失败', detail: error.message });
  }
}
