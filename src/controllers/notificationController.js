import {
  listNotificationsByUser,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications
} from '../services/notificationService.js';

const RESPONSE_TEXT = {
  forbidden: '没有权限',
  fetchFailed: '获取通知失败',
  notFound: '通知不存在',
  markFailed: '更新通知失败'
};

function ensureSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    res.status(403).json({ message: RESPONSE_TEXT.forbidden });
    return null;
  }
  return sessionUser;
}

export async function listNotifications(req, res) {
  const sessionUser = ensureSession(req, res);
  if (!sessionUser) return;

  try {
    const limit = Number.parseInt(req.query.limit ?? '30', 10);
    const offset = Number.parseInt(req.query.offset ?? '0', 10);
    const notifications = await listNotificationsByUser(sessionUser.id, { limit, offset });
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: RESPONSE_TEXT.fetchFailed, detail: error.message });
  }
}

export async function getUnreadCount(req, res) {
  const sessionUser = ensureSession(req, res);
  if (!sessionUser) return;

  try {
    const total = await countUnreadNotifications(sessionUser.id);
    res.json({ total });
  } catch (error) {
    res.status(500).json({ message: RESPONSE_TEXT.fetchFailed, detail: error.message });
  }
}

export async function markNotificationAsRead(req, res) {
  const sessionUser = ensureSession(req, res);
  if (!sessionUser) return;

  try {
    const notificationId = Number.parseInt(req.params.notificationId, 10);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(404).json({ message: RESPONSE_TEXT.notFound });
    }

    const ok = await markNotificationRead(sessionUser.id, notificationId);
    if (!ok) {
      return res.status(404).json({ message: RESPONSE_TEXT.notFound });
    }
    return res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: RESPONSE_TEXT.markFailed, detail: error.message });
  }
}

export async function markAllNotificationsAsRead(req, res) {
  const sessionUser = ensureSession(req, res);
  if (!sessionUser) return;

  try {
    await markAllNotificationsRead(sessionUser.id);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: RESPONSE_TEXT.markFailed, detail: error.message });
  }
}
