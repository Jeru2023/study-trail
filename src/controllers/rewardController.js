import {
  createRewardItem,
  deleteRewardItem,
  listRewardsForParent,
  listRewardsForStudent,
  updateRewardItem
} from '../services/rewardService.js';

function ensureSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    res.status(401).json({ message: '未登录' });
    return null;
  }
  return sessionUser;
}

function ensureParentSession(req, res) {
  const sessionUser = ensureSession(req, res);
  if (!sessionUser) return null;
  if (sessionUser.role !== 'parent') {
    res.status(403).json({ message: '没有权限' });
    return null;
  }
  return sessionUser;
}

function parseRewardPayload(body) {
  const rawTitle = body?.title ?? '';
  const title = String(rawTitle).trim();
  if (!title) {
    throw new Error('TITLE_REQUIRED');
  }

  const description = body?.description ? String(body.description).trim() : null;

  const costValue = Number.parseInt(body?.pointsCost ?? body?.points_cost ?? '', 10);
  if (!Number.isInteger(costValue) || costValue < 0) {
    throw new Error('POINTS_INVALID');
  }

  let stockValue = null;
  if (body?.stock !== undefined && body.stock !== null && body.stock !== '') {
    const parsedStock = Number.parseInt(body.stock, 10);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      throw new Error('STOCK_INVALID');
    }
    stockValue = parsedStock;
  }

  const isActive =
    body?.isActive !== undefined
      ? Boolean(body.isActive)
      : body?.is_active !== undefined
        ? Boolean(body.is_active)
        : true;

  return { title, description, pointsCost: costValue, stock: stockValue, isActive };
}

export async function listRewards(req, res) {
  const sessionUser = ensureSession(req, res);
  if (!sessionUser) return;

  try {
    if (sessionUser.role === 'parent') {
      const rewards = await listRewardsForParent(sessionUser.id);
      res.json({ rewards });
      return;
    }

    if (sessionUser.role === 'student') {
      if (!sessionUser.parentId) {
        res.status(400).json({ message: '尚未绑定家长账号，无法查看积分商城' });
        return;
      }
      const rewards = await listRewardsForStudent(sessionUser.parentId);
      res.json({ rewards });
      return;
    }

    res.status(403).json({ message: '没有权限' });
  } catch (error) {
    res.status(500).json({ message: '获取积分商城失败', detail: error.message });
  }
}

export async function createReward(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const payload = parseRewardPayload(req.body);
    const reward = await createRewardItem({
      parentId: sessionUser.id,
      ...payload
    });
    res.status(201).json({ reward });
  } catch (error) {
    if (error.message === 'TITLE_REQUIRED') {
      res.status(400).json({ message: '请填写奖励名称' });
      return;
    }
    if (error.message === 'POINTS_INVALID') {
      res.status(400).json({ message: '积分值必须是大于等于 0 的整数' });
      return;
    }
    if (error.message === 'STOCK_INVALID') {
      res.status(400).json({ message: '库存需为大于等于 0 的整数，或留空表示不限' });
      return;
    }
    res.status(500).json({ message: '新增奖励失败', detail: error.message });
  }
}

export async function updateReward(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const rewardId = Number.parseInt(String(req.params.rewardId).trim(), 10);
  if (!Number.isInteger(rewardId) || rewardId <= 0) {
    res.status(400).json({ message: '奖励 ID 不合法' });
    return;
  }

  try {
    const payload = parseRewardPayload(req.body);
    const reward = await updateRewardItem({
      parentId: sessionUser.id,
      rewardId,
      ...payload
    });
    res.json({ reward });
  } catch (error) {
    if (error.message === 'TITLE_REQUIRED') {
      res.status(400).json({ message: '请填写奖励名称' });
      return;
    }
    if (error.message === 'POINTS_INVALID') {
      res.status(400).json({ message: '积分值必须是大于等于 0 的整数' });
      return;
    }
    if (error.message === 'STOCK_INVALID') {
      res.status(400).json({ message: '库存需为大于等于 0 的整数，或留空表示不限' });
      return;
    }
    if (error.message === 'REWARD_NOT_FOUND') {
      res.status(404).json({ message: '未找到奖励' });
      return;
    }
    res.status(500).json({ message: '更新奖励失败', detail: error.message });
  }
}

export async function deleteReward(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const rewardId = Number.parseInt(String(req.params.rewardId).trim(), 10);
  if (!Number.isInteger(rewardId) || rewardId <= 0) {
    res.status(400).json({ message: '奖励 ID 不合法' });
    return;
  }

  try {
    await deleteRewardItem({ parentId: sessionUser.id, rewardId });
    res.status(204).end();
  } catch (error) {
    if (error.message === 'REWARD_NOT_FOUND') {
      res.status(404).json({ message: '未找到奖励' });
      return;
    }
    res.status(500).json({ message: '删除奖励失败', detail: error.message });
  }
}
