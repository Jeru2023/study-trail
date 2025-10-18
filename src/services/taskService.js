import { pool } from '../db/pool.js';

export async function listTasksByParent(parentId) {
  const [rows] = await pool.query(
    `SELECT id, title, description, start_date, end_date, created_at, updated_at
     FROM tasks
     WHERE parent_id = ?
     ORDER BY created_at DESC`,
    [parentId]
  );
  return rows;
}

export async function findTaskById(parentId, taskId) {
  const [rows] = await pool.query(
    `SELECT id, title, description, start_date, end_date, created_at, updated_at
     FROM tasks
     WHERE id = ? AND parent_id = ?
     LIMIT 1`,
    [taskId, parentId]
  );
  return rows[0] || null;
}

export async function createTask(parentId, payload) {
  const { title, description = null, startDate = null, endDate = null } = payload;

  const [result] = await pool.query(
    `INSERT INTO tasks (parent_id, title, description, start_date, end_date)
     VALUES (?, ?, ?, ?, ?)`,
    [parentId, title, description, startDate, endDate]
  );

  return findTaskById(parentId, result.insertId);
}

export async function updateTask(parentId, taskId, payload) {
  const { title, description = null, startDate = null, endDate = null } = payload;

  await pool.query(
    `UPDATE tasks
     SET title = ?, description = ?, start_date = ?, end_date = ?
     WHERE id = ? AND parent_id = ?`,
    [title, description, startDate, endDate, taskId, parentId]
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
