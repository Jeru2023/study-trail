import { getPointsDashboard, getStudentPointsHistory } from '../services/analyticsService.js';

const TEXT = {
  forbidden: '没有权限',
  loadDashboardFailed: '获取积分看板数据失败',
  studentNotFound: '未找到学生信息',
  loadHistoryFailed: '获取积分历史数据失败',
  invalidSince: '查询时间范围无效',
  invalidStudent: '学生信息有误'
};

function ensureParentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'parent') {
    res.status(403).json({ message: TEXT.forbidden });
    return null;
  }
  return sessionUser;
}

export async function getDashboard(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const data = await getPointsDashboard(sessionUser.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: TEXT.loadDashboardFailed, detail: error.message });
  }
}

export async function getStudentHistory(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const studentId = Number.parseInt(req.params.studentId, 10);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    res.status(400).json({ message: TEXT.invalidStudent });
    return;
  }

  const sourcesParam = req.query.sources;
  const sinceParam = req.query.since;

  const sources = typeof sourcesParam === 'string' && sourcesParam.trim().length > 0
    ? sourcesParam
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : undefined;

  try {
    const payload = await getStudentPointsHistory({
      parentId: sessionUser.id,
      studentId,
      since: sinceParam,
      sources
    });
    res.json(payload);
  } catch (error) {
    if (error.message === 'STUDENT_NOT_FOUND') {
      res.status(404).json({ message: TEXT.studentNotFound });
      return;
    }
    if (error.message === 'INVALID_SINCE') {
      res.status(400).json({ message: TEXT.invalidSince });
      return;
    }
    res.status(500).json({ message: TEXT.loadHistoryFailed, detail: error.message });
  }
}
