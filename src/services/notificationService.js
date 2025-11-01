import { pool } from '../db/pool.js';
import { ensureTaskSchedulingArtifacts } from '../db/schemaUpgrades.js';

function resolveClient(client) {
  return client ?? pool;
}

function mapNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    linkUrl: row.link_url,
    isRead: row.is_read === 1,
    createdAt: row.created_at
  };
}

export async function createNotification(client, { userId, title, body = null, linkUrl = null }) {
  await ensureTaskSchedulingArtifacts();
  const db = resolveClient(client);
  const [result] = await db.query(
    `INSERT INTO notifications (user_id, title, body, link_url)
     VALUES (?, ?, ?, ?)`,
    [userId, title, body ?? null, linkUrl ?? null]
  );

  const [rows] = await db.query(
    `SELECT id, user_id, title, body, link_url, is_read, created_at
       FROM notifications
      WHERE id = ?
      LIMIT 1`,
    [result.insertId]
  );

  return mapNotification(rows[0]);
}

export async function listNotificationsByUser(userId, { limit = 30, offset = 0 } = {}) {
  await ensureTaskSchedulingArtifacts();
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 30;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

  const [rows] = await pool.query(
    `SELECT id, user_id, title, body, link_url, is_read, created_at
       FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?`,
    [userId, safeLimit, safeOffset]
  );

  return rows.map(mapNotification);
}

export async function markNotificationRead(userId, notificationId) {
  await ensureTaskSchedulingArtifacts();
  const [result] = await pool.query(
    `UPDATE notifications
        SET is_read = 1
      WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
  return result.affectedRows > 0;
}

export async function markAllNotificationsRead(userId) {
  await ensureTaskSchedulingArtifacts();
  const [result] = await pool.query(
    `UPDATE notifications
        SET is_read = 1
      WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return result.affectedRows;
}

export async function countUnreadNotifications(userId) {
  await ensureTaskSchedulingArtifacts();
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM notifications
      WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return Number(row?.total ?? 0);
}
