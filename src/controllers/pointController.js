import {
  adjustStudentPoints,
  listStudentLedgerEntries,
  listStudentPointsSummary,
  redeemRewardForStudent
} from '../services/pointService.js';

const TEXT = {
  forbidden: '\u6ca1\u6709\u6743\u9650',
  studentNotFound: '\u672a\u627e\u5230\u5b66\u751f\u4fe1\u606f',
  loadSummaryFailed: '\u52a8\u6001\u83b7\u53d6\u79ef\u5206\u6982\u89c8\u5931\u8d25',
  loadHistoryFailed: '\u83b7\u53d6\u79ef\u5206\u6b77\u53f2\u5931\u8d25',
  adjustSuccess: '\u79ef\u5206\u66f4\u65b0\u6210\u529f',
  adjustFailed: '\u79ef\u5206\u8c03\u6574\u5931\u8d25',
  redeemSuccess: '\u79ef\u5206\u5151\u6362\u6210\u529f',
  redeemFailed: '\u5151\u6362\u5956\u52b1\u5931\u8d25',
  invalidDelta: '\u8bf7\u586b\u5199\u6b63\u6216\u8d1f\u7684\u6574\u6570\u52a0\u51cf\u503c',
  insufficientPoints: '\u5f53\u524d\u79ef\u5206\u4e0d\u8db3',
  rewardNotFound: '\u5956\u52b1\u4e0d\u53ef\u7528',
  rewardInactive: '\u5956\u52b1\u672a\u4e0a\u67b6',
  rewardStockShortage: '\u5956\u52b1\u5e93\u5b58\u4e0d\u8db3',
  invalidQuantity: '\u8bf7\u586b\u5199\u5408\u6cd5\u7684\u5151\u6362\u6570\u91cf'
};

function ensureParentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'parent') {
    res.status(403).json({ message: TEXT.forbidden });
    return null;
  }
  return sessionUser;
}

export async function getStudentSummaries(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const students = await listStudentPointsSummary(sessionUser.id);
    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: TEXT.loadSummaryFailed, detail: error.message });
  }
}

export async function getStudentLedger(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const studentId = Number.parseInt(req.params.studentId, 10);
    if (Number.isNaN(studentId)) {
      return res.status(404).json({ message: TEXT.studentNotFound });
    }

    const entries = await listStudentLedgerEntries({
      parentId: sessionUser.id,
      studentId
    });
    return res.json({ entries });
  } catch (error) {
    if (error.message === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ message: TEXT.studentNotFound });
    }
    return res.status(500).json({ message: TEXT.loadHistoryFailed, detail: error.message });
  }
}

export async function postAdjustStudentPoints(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const studentId = Number.parseInt(req.params.studentId, 10);
    if (Number.isNaN(studentId)) {
      return res.status(404).json({ message: TEXT.studentNotFound });
    }

    const delta = Number.parseInt(req.body?.delta, 10);
    const note = req.body?.note;

    const result = await adjustStudentPoints({
      parentId: sessionUser.id,
      studentId,
      delta,
      note
    });

    return res.status(201).json({
      message: TEXT.adjustSuccess,
      student: result.student,
      entry: result.entry
    });
  } catch (error) {
    if (error.message === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ message: TEXT.studentNotFound });
    }
    if (error.message === 'INVALID_DELTA') {
      return res.status(400).json({ message: TEXT.invalidDelta });
    }
    if (error.message === 'INSUFFICIENT_POINTS') {
      return res.status(400).json({ message: TEXT.insufficientPoints });
    }
    return res.status(500).json({ message: TEXT.adjustFailed, detail: error.message });
  }
}

export async function postRedeemReward(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const studentId = Number.parseInt(req.params.studentId, 10);
    if (Number.isNaN(studentId)) {
      return res.status(404).json({ message: TEXT.studentNotFound });
    }

    const rewardId = Number.parseInt(req.body?.rewardId, 10);
    if (Number.isNaN(rewardId)) {
      return res.status(400).json({ message: TEXT.rewardNotFound });
    }
    const quantityRaw = req.body?.quantity ?? 1;
    const note = req.body?.note;

    const result = await redeemRewardForStudent({
      parentId: sessionUser.id,
      studentId,
      rewardId,
      quantity: quantityRaw,
      note
    });

    return res.status(201).json({
      message: TEXT.redeemSuccess,
      student: result.student,
      reward: result.reward,
      entry: result.entry
    });
  } catch (error) {
    if (error.message === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ message: TEXT.studentNotFound });
    }
    if (error.message === 'REWARD_NOT_FOUND') {
      return res.status(404).json({ message: TEXT.rewardNotFound });
    }
    if (error.message === 'REWARD_INACTIVE') {
      return res.status(400).json({ message: TEXT.rewardInactive });
    }
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({ message: TEXT.rewardStockShortage });
    }
    if (error.message === 'INVALID_QUANTITY') {
      return res.status(400).json({ message: TEXT.invalidQuantity });
    }
    if (error.message === 'INSUFFICIENT_POINTS') {
      return res.status(400).json({ message: TEXT.insufficientPoints });
    }
    return res.status(500).json({ message: TEXT.redeemFailed, detail: error.message });
  }
}
