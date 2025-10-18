import path from 'path';
import { pool } from '../db/pool.js';
import { config } from '../config.js';

function ensureValidDate(input) {
  if (!input) {
    return new Date();
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('INVALID_DATE');
  }
  return parsed;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function toPosixRelative(filePath) {
  return filePath.replace(/\\/g, '/');
}

function buildPhotoUrl(relativePath) {
  const safePath = toPosixRelative(relativePath).replace(/^\//, '');
  return `${config.uploads.baseUrl}/${safePath}`;
}

async function ensureAssignment(studentId, taskId) {
  const [[assignment]] = await pool.query(
    `SELECT st.parent_id, t.start_date, t.end_date
       FROM student_tasks st
       INNER JOIN tasks t ON st.task_id = t.id
      WHERE st.student_id = ? AND st.task_id = ?
      LIMIT 1`,
    [studentId, taskId]
  );

  if (!assignment) {
    throw new Error('ASSIGNMENT_NOT_FOUND');
  }
  return assignment;
}

function assertWithinDateRange(entryDate, startDate, endDate) {
  if (startDate && entryDate < new Date(startDate)) {
    throw new Error('TASK_DATE_OUT_OF_RANGE');
  }
  if (endDate && entryDate > new Date(endDate)) {
    throw new Error('TASK_DATE_OUT_OF_RANGE');
  }
}

function mapEntryRow(row, photos = []) {
  return {
    id: row.id,
    parentId: row.parent_id,
    studentId: row.student_id,
    taskId: row.task_id,
    entryDate: row.entry_date,
    title: row.title,
    notes: row.notes,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: photos
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((photo) => ({
        id: photo.id,
        originalName: photo.original_name,
        url: buildPhotoUrl(photo.file_path),
        uploadedAt: photo.created_at
      }))
  };
}

async function fetchEntries(studentId, entryDate, taskIds) {
  if (!taskIds.length) {
    return { entries: [], photos: [] };
  }

  const [entries] = await pool.query(
    `SELECT *
       FROM student_task_entries
      WHERE student_id = ?
        AND entry_date = ?
        AND task_id IN (?)
      ORDER BY created_at ASC`,
    [studentId, entryDate, taskIds]
  );

  const entryIds = entries.map((entry) => entry.id);
  if (!entryIds.length) {
    return { entries, photos: [] };
  }

  const [photos] = await pool.query(
    `SELECT *
       FROM student_task_entry_photos
      WHERE entry_id IN (?)
      ORDER BY created_at ASC`,
    [entryIds]
  );

  return { entries, photos };
}

function groupPhotosByEntry(photos) {
  const map = new Map();
  photos.forEach((photo) => {
    if (!map.has(photo.entry_id)) {
      map.set(photo.entry_id, []);
    }
    map.get(photo.entry_id).push(photo);
  });
  return map;
}

export async function listDailyTasksForStudent(studentId, dateInput) {
  const targetDate = ensureValidDate(dateInput);
  const dateString = formatDate(targetDate);

  const [assignments] = await pool.query(
    `SELECT st.task_id,
            st.parent_id,
            t.title,
            t.description,
            t.points,
            t.start_date,
            t.end_date,
            t.created_at
       FROM student_tasks st
       INNER JOIN tasks t ON st.task_id = t.id
      WHERE st.student_id = ?
        AND (t.start_date IS NULL OR t.start_date <= ?)
        AND (t.end_date IS NULL OR t.end_date >= ?)
      ORDER BY t.created_at DESC`,
    [studentId, dateString, dateString]
  );

  const taskIds = assignments.map((assignment) => assignment.task_id);
  const { entries, photos } = await fetchEntries(studentId, dateString, taskIds);
  const photoMap = groupPhotosByEntry(photos);
  const entryMap = new Map(
    entries.map((entry) => [entry.id, mapEntryRow(entry, photoMap.get(entry.id) || [])])
  );

  const entriesByTask = new Map();
  Array.from(entryMap.values()).forEach((entry) => {
    if (!entriesByTask.has(entry.taskId)) {
      entriesByTask.set(entry.taskId, []);
    }
    entriesByTask.get(entry.taskId).push(entry);
  });

  const tasks = assignments.map((assignment) => ({
    taskId: assignment.task_id,
    parentId: assignment.parent_id,
    title: assignment.title,
    description: assignment.description,
    points: assignment.points,
    startDate: assignment.start_date,
    endDate: assignment.end_date,
    subtasks: entriesByTask.get(assignment.task_id) || []
  }));

  return { date: dateString, tasks };
}

export async function createSubtaskEntry({ studentId, taskId, entryDate, title, notes }) {
  const trimmedTitle = title?.trim();
  if (!trimmedTitle) {
    throw new Error('TITLE_REQUIRED');
  }

  const dateValue = ensureValidDate(entryDate);
  const dateString = formatDate(dateValue);
  const assignment = await ensureAssignment(studentId, taskId);
  assertWithinDateRange(dateValue, assignment.start_date, assignment.end_date);

  const [result] = await pool.query(
    `INSERT INTO student_task_entries
       (parent_id, student_id, task_id, entry_date, title, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [assignment.parent_id, studentId, taskId, dateString, trimmedTitle, notes?.trim() || null]
  );

  return getEntryById(result.insertId, studentId);
}

export async function getEntryById(entryId, studentId) {
  const [[row]] = await pool.query(
    `SELECT *
       FROM student_task_entries
      WHERE id = ? AND student_id = ?
      LIMIT 1`,
    [entryId, studentId]
  );

  if (!row) {
    throw new Error('ENTRY_NOT_FOUND');
  }

  const [photos] = await pool.query(
    `SELECT *
       FROM student_task_entry_photos
      WHERE entry_id = ?
      ORDER BY created_at ASC`,
    [row.id]
  );

  return mapEntryRow(row, photos);
}

export async function startSubtaskEntry({ entryId, studentId }) {
  const entry = await getEntryById(entryId, studentId);
  if (entry.status === 'completed') {
    throw new Error('ENTRY_ALREADY_COMPLETED');
  }

  const newStatus = entry.status === 'pending' ? 'in_progress' : entry.status;
  const startedAt = entry.startedAt || new Date();

  await pool.query(
    `UPDATE student_task_entries
        SET status = ?,
            started_at = ?,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND student_id = ?`,
    [newStatus, startedAt, entryId, studentId]
  );

  return getEntryById(entryId, studentId);
}

export async function countPhotosForEntry(entryId, connection = pool) {
  const [[{ total } = { total: 0 }]] = await connection.query(
    `SELECT COUNT(*) AS total
       FROM student_task_entry_photos
      WHERE entry_id = ?`,
    [entryId]
  );
  return Number(total) || 0;
}

export async function completeSubtaskEntry({ entryId, studentId, notes, files }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[entry]] = await connection.query(
      `SELECT *
         FROM student_task_entries
        WHERE id = ? AND student_id = ?
        LIMIT 1`,
      [entryId, studentId]
    );

    if (!entry) {
      throw new Error('ENTRY_NOT_FOUND');
    }

    const existingPhotos = await countPhotosForEntry(entryId, connection);
    const filesToPersist = Array.isArray(files) ? files : [];

    if (existingPhotos + filesToPersist.length > config.uploads.maxPhotosPerEntry) {
      throw new Error('PHOTO_LIMIT_EXCEEDED');
    }

    const now = new Date();
    const startedAt = entry.started_at ? new Date(entry.started_at.replace(' ', 'T')) : now;
    const durationSeconds = Math.max(
      0,
      Math.floor((now.getTime() - startedAt.getTime()) / 1000)
    );

    await connection.query(
      `UPDATE student_task_entries
          SET status = 'completed',
              started_at = ?,
              completed_at = ?,
              notes = ?,
              duration_seconds = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND student_id = ?`,
      [startedAt, now, notes?.trim() || null, durationSeconds, entryId, studentId]
    );

    if (filesToPersist.length) {
      const values = filesToPersist
        .map(() => '(?, ?, ?)')
        .join(', ');
      const params = filesToPersist.flatMap((file) => [
        entryId,
        toPosixRelative(path.relative(config.uploads.baseDir, file.path)),
        file.originalname || null
      ]);

      await connection.query(
        `INSERT INTO student_task_entry_photos (entry_id, file_path, original_name)
         VALUES ${values}`,
        params
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getEntryById(entryId, studentId);
}
