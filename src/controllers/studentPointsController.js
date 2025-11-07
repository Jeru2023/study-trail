import {
  listParentLedgerFeed,
  listStudentPointsSummary
} from '../services/pointService.js';

function ensureStudentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'student') {
    res.status(401).json({ message: '未登录' });
    return null;
  }
  if (!sessionUser.parentId) {
    res.status(400).json({ message: '未关联家长账号，无法查看积分榜' });
    return null;
  }
  return sessionUser;
}

function normalizeLeaderboard(students, currentStudentId) {
  return [...students]
    .sort((a, b) => b.pointsBalance - a.pointsBalance || a.id - b.id)
    .map((student, index) => ({
      id: student.id,
      name: student.displayName || student.loginName,
      points: student.pointsBalance,
      earnedTotal: student.earnedTotal,
      spentTotal: student.spentTotal,
      rank: index + 1,
      isCurrent: student.id === currentStudentId
    }));
}

function normalizeFeed(entries) {
  return entries.map((entry) => ({
    id: entry.id,
    studentId: entry.studentId,
    studentName: entry.studentName || entry.studentLoginName || '同学',
    points: entry.points,
    source: entry.source,
    note: entry.note,
    createdAt: entry.createdAt,
    taskTitle: entry.taskTitle || null,
    rewardTitle: entry.rewardTitle || null,
    planDate: entry.planDate || null
  }));
}

export async function getStudentLeaderboard(req, res) {
  const sessionUser = ensureStudentSession(req, res);
  if (!sessionUser) return;

  try {
    const students = await listStudentPointsSummary(sessionUser.parentId);
    const leaderboard = normalizeLeaderboard(students, sessionUser.id);
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ message: '获取积分榜失败', detail: error.message });
  }
}

export async function getStudentPointFeed(req, res) {
  const sessionUser = ensureStudentSession(req, res);
  if (!sessionUser) return;

  const limit = Number.parseInt(req.query.limit, 10);
  const rangeKey = String(req.query.rangeKey || '')
    .trim()
    .toLowerCase();
  const filterStudentId = Number.parseInt(req.query.studentId, 10);

  try {
    const entries = await listParentLedgerFeed({
      parentId: sessionUser.parentId,
      limit: Number.isInteger(limit) && limit > 0 ? limit : 50,
      rangeKey,
      studentId:
        Number.isInteger(filterStudentId) && filterStudentId > 0 ? filterStudentId : undefined
    });
    res.json({ entries: normalizeFeed(entries) });
  } catch (error) {
    res.status(500).json({ message: '获取积分动态失败', detail: error.message });
  }
}
