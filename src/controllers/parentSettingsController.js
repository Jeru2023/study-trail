import {
  getPlanRewardPoints,
  savePlanRewardPoints
} from '../services/parentSettingsService.js';

const RESPONSE_TEXT = {
  forbidden: '没有权限',
  pointsRequired: '请填写奖励积分',
  pointsInvalid: '奖励积分需为大于等于 0 的整数',
  fetchFailed: '获取计划奖励配置失败',
  updateFailed: '保存计划奖励配置失败'
};

function ensureParentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'parent') {
    res.status(403).json({ message: RESPONSE_TEXT.forbidden });
    return null;
  }
  return sessionUser;
}

function parsePointsInput(body) {
  const raw = body?.points ?? body?.planRewardPoints ?? body?.plan_reward_points;
  if (raw === undefined || raw === null || raw === '') {
    throw new Error('POINTS_REQUIRED');
  }
  const parsed = Number.parseInt(String(raw).trim(), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error('POINTS_INVALID');
  }
  return parsed;
}

export async function getPlanRewardSetting(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;
  try {
    const planRewardPoints = await getPlanRewardPoints(sessionUser.id);
    res.json({ planRewardPoints });
  } catch (error) {
    res.status(500).json({ message: RESPONSE_TEXT.fetchFailed, detail: error.message });
  }
}

export async function updatePlanRewardSetting(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;
  try {
    const points = parsePointsInput(req.body);
    const planRewardPoints = await savePlanRewardPoints(sessionUser.id, points);
    res.json({ planRewardPoints });
  } catch (error) {
    if (error.message === 'POINTS_REQUIRED') {
      res.status(400).json({ message: RESPONSE_TEXT.pointsRequired });
      return;
    }
    if (error.message === 'POINTS_INVALID') {
      res.status(400).json({ message: RESPONSE_TEXT.pointsInvalid });
      return;
    }
    res.status(500).json({ message: RESPONSE_TEXT.updateFailed, detail: error.message });
  }
}
