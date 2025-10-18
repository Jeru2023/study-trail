import { pool } from '../db/pool.js';

function mapTaskRow(row) {
  if (!row) return null;
  const plain = { ...row };
  const parsedPoints = Number.parseInt(String(plain.points ?? '').trim(), 10);
  const normalizedPoints = Number.isNaN(parsedPoints) || parsedPoints < 0 ? 0 : parsedPoints;
  return { ...plain, points: normalizedPoints };
}

export async function listTasksByParent(parentId) {
  const [rows] = await pool.query(
    `SELECT id, title, description, points, start_date, end_date, created_at, updated_at
     FROM tasks
     WHERE parent_id = ?
     ORDER BY created_at DESC`,
    [parentId]
  );
  return rows.map(mapTaskRow);
}

export async function findTaskById(parentId, taskId) {
  const [rows] = await pool.query(
    `SELECT id, title, description, points, start_date, end_date, created_at, updated_at
     FROM tasks
     WHERE id = ? AND parent_id = ?
     LIMIT 1`,
    [taskId, parentId]
  );
  return mapTaskRow(rows[0]) || null;
}

export async function createTask(parentId, payload) {
  const { title, description = null, points, startDate = null, endDate = null } = payload;
  const numericPoints = Number.parseInt(String(points ?? '').trim(), 10);
  const normalizedPoints = Number.isNaN(numericPoints) || numericPoints < 0 ? 0 : numericPoints;

  const [result] = await pool.query(
    `INSERT INTO tasks (parent_id, title, description, points, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [parentId, title, description, normalizedPoints, startDate, endDate]
  );

  return findTaskById(parentId, result.insertId);
}

export async function updateTask(parentId, taskId, payload) {
  const { title, description = null, points, startDate = null, endDate = null } = payload;
  const numericPoints = Number.parseInt(String(points ?? '').trim(), 10);
  const normalizedPoints = Number.isNaN(numericPoints) || numericPoints < 0 ? 0 : numericPoints;

  await pool.query(
    `UPDATE tasks
     SET title = ?, description = ?, points = ?, start_date = ?, end_date = ?
     WHERE id = ? AND parent_id = ?`,
    [title, description, normalizedPoints, startDate, endDate, taskId, parentId]
  );

  return findTaskById(parentId, taskId);
}

export async function deleteTask(parentId, taskId) {
  const [result] = await pool.query(
    `DELETE FROM tasks WHERE id = ? AND parent_id = ?`,
    [taskId, parentId]
  );
  return result.affectedRows > 0;
}
