import {
  approveEntryForParent,
  listEntriesForParent,
  rejectEntryForParent,
  deleteEntryForParent
} from '../services/studentDailyTaskService.js';

function ensureParentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'parent') {
    res.status(403).json({ message: '没有权限' });
    return null;
  }
  return sessionUser;
}

function sanitizeDateParam(value) {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

export async function listDailyApprovals(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const date = sanitizeDateParam(req.query.date);
    const result = await listEntriesForParent(sessionUser.id, date);
    res.json({ date: result.date, entries: result.entries });
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      res.status(400).json({ message: '日期格式不正确' });
      return;
    }
    res.status(500).json({ message: '获取打卡记录失败', detail: error.message });
  }
}

export async function approveEntry(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const entryId = Number.parseInt(String(req.params.entryId).trim(), 10);
  if (!Number.isInteger(entryId) || entryId <= 0) {
    res.status(400).json({ message: '打卡记录 ID 不合法' });
    return;
  }

  try {
    const entry = await approveEntryForParent({
      parentId: sessionUser.id,
      entryId,
      note: req.body?.note
    });
    res.json({ entry });
  } catch (error) {
    if (error.message === 'ENTRY_NOT_FOUND') {
      res.status(404).json({ message: '未找到打卡记录' });
      return;
    }
    if (error.message === 'ENTRY_NOT_COMPLETED') {
      res.status(409).json({ message: '该打卡尚未完成，无法审批' });
      return;
    }
    if (error.message === 'ENTRY_ALREADY_APPROVED') {
      res.status(409).json({ message: '该打卡已审批通过' });
      return;
    }
    res.status(500).json({ message: '审批失败', detail: error.message });
  }
}

export async function rejectEntry(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const entryId = Number.parseInt(String(req.params.entryId).trim(), 10);
  if (!Number.isInteger(entryId) || entryId <= 0) {
    res.status(400).json({ message: '打卡记录 ID 不合法' });
    return;
  }

  try {
    const entry = await rejectEntryForParent({
      parentId: sessionUser.id,
      entryId,
      note: req.body?.note
    });
    res.json({ entry });
  } catch (error) {
    if (error.message === 'ENTRY_NOT_FOUND') {
      res.status(404).json({ message: '未找到打卡记录' });
      return;
    }
    if (error.message === 'ENTRY_NOT_COMPLETED') {
      res.status(409).json({ message: '该打卡尚未完成，无法驳回' });
      return;
    }
    if (error.message === 'ENTRY_ALREADY_APPROVED') {
      res.status(409).json({ message: '该打卡已审批通过，无法驳回' });
      return;
    }
    res.status(500).json({ message: '驳回失败', detail: error.message });
  }
}

export async function deleteEntry(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const entryId = Number.parseInt(String(req.params.entryId).trim(), 10);
  if (!Number.isInteger(entryId) || entryId <= 0) {
    res.status(400).json({ message: '打卡记录 ID 不合法' });
    return;
  }

  try {
    await deleteEntryForParent({
      parentId: sessionUser.id,
      entryId
    });
    res.status(204).end();
  } catch (error) {
    if (error.message === 'ENTRY_NOT_FOUND') {
      res.status(404).json({ message: '未找到打卡记录' });
      return;
    }
    if (error.message === 'ENTRY_ALREADY_APPROVED') {
      res.status(409).json({ message: '该打卡已审批通过，无法删除' });
      return;
    }
    res.status(500).json({ message: '删除失败', detail: error.message });
  }
}
