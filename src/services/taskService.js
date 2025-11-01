import { pool } from '../db/pool.js';
import { ensureTaskSchedulingArtifacts } from '../db/schemaUpgrades.js';

const SCHEDULE_TYPES = new Set(['weekday', 'holiday']);

function normalizeScheduleType(value) {
  const trimmed = String(value ?? '').trim();
  return SCHEDULE_TYPES.has(trimmed) ? trimmed : 'weekday';
}

function mapTaskRow(row) {
  if (!row) return null;
  const plain = { ...row };
  const parsedPoints = Number.parseInt(String(plain.points ?? '').trim(), 10);
  const normalizedPoints = Number.isNaN(parsedPoints) || parsedPoints < 0 ? 0 : parsedPoints;
  const scheduleType = normalizeScheduleType(plain.schedule_type);
  return { ...plain, points: normalizedPoints, schedule_type: scheduleType };
}

export async function listTasksByParent(parentId) {
  await ensureTaskSchedulingArtifacts();
  const [rows] = await pool.query(
    `SELECT id, title, description, points, schedule_type, start_date, end_date, created_at, updated_at
     FROM tasks
     WHERE parent_id = ?
     ORDER BY created_at DESC`,
    [parentId]
  );
  return rows.map(mapTaskRow);
}

export async function findTaskById(parentId, taskId) {
  await ensureTaskSchedulingArtifacts();
  const [rows] = await pool.query(
    `SELECT id, title, description, points, schedule_type, start_date, end_date, created_at, updated_at
     FROM tasks
     WHERE id = ? AND parent_id = ?
     LIMIT 1`,
    [taskId, parentId]
  );
  return mapTaskRow(rows[0]) || null;
}

export async function createTask(parentId, payload) {
  await ensureTaskSchedulingArtifacts();
  const {
    title,
    description = null,
    points,
    startDate = null,
    endDate = null,
    scheduleType = 'weekday'
  } = payload;
  const numericPoints = Number.parseInt(String(points ?? '').trim(), 10);
  const normalizedPoints = Number.isNaN(numericPoints) || numericPoints < 0 ? 0 : numericPoints;
  const normalizedScheduleType = normalizeScheduleType(scheduleType);

  const [result] = await pool.query(
    `INSERT INTO tasks (parent_id, title, description, points, schedule_type, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [parentId, title, description, normalizedPoints, normalizedScheduleType, startDate, endDate]
  );

  return findTaskById(parentId, result.insertId);
}

export async function updateTask(parentId, taskId, payload) {
  await ensureTaskSchedulingArtifacts();
  const {
    title,
    description = null,
    points,
    startDate = null,
    endDate = null,
    scheduleType = 'weekday'
  } = payload;
  const numericPoints = Number.parseInt(String(points ?? '').trim(), 10);
  const normalizedPoints = Number.isNaN(numericPoints) || numericPoints < 0 ? 0 : numericPoints;
  const normalizedScheduleType = normalizeScheduleType(scheduleType);

  await pool.query(
    `UPDATE tasks
     SET title = ?, description = ?, points = ?, schedule_type = ?, start_date = ?, end_date = ?
     WHERE id = ? AND parent_id = ?`,
    [
      title,
      description,
      normalizedPoints,
      normalizedScheduleType,
      startDate,
      endDate,
      taskId,
      parentId
    ]
  );

  return findTaskById(parentId, taskId);
}

export async function deleteTask(parentId, taskId) {
  await ensureTaskSchedulingArtifacts();
  const [result] = await pool.query(
    `DELETE FROM tasks WHERE id = ? AND parent_id = ?`,
    [taskId, parentId]
  );
  return result.affectedRows > 0;
}

function normalizeDateInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function mapOverrideRow(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    startDate: row.start_date,
    endDate: row.end_date,
    scheduleType: normalizeScheduleType(row.schedule_type),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeDateRange(startValue, endValue) {
  const start = normalizeDateInput(startValue);
  const end = normalizeDateInput(endValue);
  if (!start || !end) {
    throw new Error('INVALID_DATE');
  }
  if (end < start) {
    throw new Error('INVALID_RANGE');
  }
  return { start, end };
}

export async function listScheduleOverrides(parentId) {
  await ensureTaskSchedulingArtifacts();
  const [rows] = await pool.query(
    `SELECT id, parent_id, start_date, end_date, schedule_type, note, created_at, updated_at
       FROM task_schedule_overrides
      WHERE parent_id = ?
      ORDER BY start_date ASC, end_date ASC`,
    [parentId]
  );
  return rows.map(mapOverrideRow);
}

export async function upsertScheduleOverride(parentId, payload) {
  await ensureTaskSchedulingArtifacts();
  const { startDate, endDate, scheduleType, note = null } = payload ?? {};
  const { start, end } = normalizeDateRange(startDate, endDate);
  const normalizedScheduleType = normalizeScheduleType(scheduleType);

  await pool.query(
    `INSERT INTO task_schedule_overrides (parent_id, start_date, end_date, schedule_type, note)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE schedule_type = VALUES(schedule_type),
     note = VALUES(note),
     start_date = VALUES(start_date),
     end_date = VALUES(end_date),
     updated_at = CURRENT_TIMESTAMP`,
    [parentId, start, end, normalizedScheduleType, note ?? null]
  );

  const [rows] = await pool.query(
    `SELECT id, parent_id, start_date, end_date, schedule_type, note, created_at, updated_at
       FROM task_schedule_overrides
      WHERE parent_id = ? AND start_date = ? AND end_date = ?
      LIMIT 1`,
    [parentId, start, end]
  );

  return mapOverrideRow(rows[0]);
}

export async function deleteScheduleOverride(parentId, overrideId) {
  await ensureTaskSchedulingArtifacts();

  const [result] = await pool.query(
    `DELETE FROM task_schedule_overrides
      WHERE parent_id = ? AND id = ?
      LIMIT 1`,
    [parentId, overrideId]
  );

  return result.affectedRows > 0;
}
