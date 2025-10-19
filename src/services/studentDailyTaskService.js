import fs from 'fs';
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

function buildProofUrl(relativePath) {
  const safePath = toPosixRelative(relativePath).replace(/^\//, '');
  return `${config.uploads.baseUrl}/${safePath}`;
}

function resolveProofAbsolutePath(relativePath) {
  if (!relativePath) return null;
  const normalized = relativePath.replace(/^[\\/]+/, '');
  return path.resolve(config.uploads.baseDir, normalized);
}

function removeProofFiles(files) {
  if (!Array.isArray(files) || !files.length) return;
  files.forEach((file) => {
    const absolutePath = resolveProofAbsolutePath(file?.file_path);
    if (!absolutePath) return;
    fs.unlink(absolutePath, (error) => {
      if (error && error.code !== 'ENOENT') {
        // eslint-disable-next-line no-console
        console.error('[proofs] failed to remove file', absolutePath, error);
      }
    });
  });
}

function detectFileCategory({ file_type: fileType, original_name: originalName = '' }) {
  if (fileType) {
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('image/')) return 'image';
  }
  const extension = path.extname(originalName).toLowerCase();
  const videoExtensions = new Set(['.mp4', '.mov', '.m4v', '.avi', '.wmv', '.webm', '.mkv']);
  if (videoExtensions.has(extension)) {
    return 'video';
  }
  return 'image';
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

function mapEntryRow(row, files = [], meta = {}) {
  const sortedFiles = files.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const proofs = sortedFiles.map((file) => ({
    id: file.id,
    originalName: file.original_name,
    url: buildProofUrl(file.file_path),
    uploadedAt: file.created_at,
    type: detectFileCategory(file)
  }));

  return {
    id: row.id,
    parentId: row.parent_id,
    studentId: row.student_id,
    taskId: row.task_id,
    entryDate: row.entry_date,
    title: row.title,
    notes: row.notes,
    status: row.status,
    reviewStatus: row.review_status,
    reviewNotes: row.review_notes,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    proofs,
    photos: proofs,
    ...meta
  };
}

async function fetchEntries(studentId, entryDate, taskIds) {
  if (!taskIds.length) {
    return { entries: [], files: [] };
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
    return { entries, files: [] };
  }

  const [files] = await pool.query(
    `SELECT *
       FROM student_task_entry_photos
      WHERE entry_id IN (?)
      ORDER BY created_at ASC`,
    [entryIds]
  );

  return { entries, files };
}

function groupFilesByEntry(files) {
  const map = new Map();
  files.forEach((file) => {
    if (!map.has(file.entry_id)) {
      map.set(file.entry_id, []);
    }
    map.get(file.entry_id).push(file);
  });
  return map;
}

async function fetchFilesForEntryIds(entryIds) {
  if (!entryIds.length) {
    return new Map();
  }

  const [files] = await pool.query(
    `SELECT *
       FROM student_task_entry_photos
      WHERE entry_id IN (?)
      ORDER BY created_at ASC`,
    [entryIds]
  );

  return groupFilesByEntry(files);
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
  const { entries, files } = await fetchEntries(studentId, dateString, taskIds);
  const fileMap = groupFilesByEntry(files);
  const entryMap = new Map(
    entries.map((entry) => [entry.id, mapEntryRow(entry, fileMap.get(entry.id) || [])])
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

async function getParentEntryRow(parentId, entryId) {
  const [rows] = await pool.query(
    `SELECT ste.*, s.display_name AS student_name, s.login_name AS student_login_name,
            t.title AS task_title, t.points AS task_points
       FROM student_task_entries ste
       INNER JOIN users s ON ste.student_id = s.id
       INNER JOIN tasks t ON ste.task_id = t.id
      WHERE ste.parent_id = ? AND ste.id = ?
      LIMIT 1`,
    [parentId, entryId]
  );

  if (!rows.length) {
    throw new Error('ENTRY_NOT_FOUND');
  }

  const fileMap = await fetchFilesForEntryIds([entryId]);

  return mapEntryRow(rows[0], fileMap.get(entryId) || [], {
    student: {
      id: rows[0].student_id,
      name: rows[0].student_name,
      loginName: rows[0].student_login_name
    },
    task: {
      id: rows[0].task_id,
      title: rows[0].task_title,
      points: rows[0].task_points
    }
  });
}

export async function listEntriesForParent(parentId, dateInput) {
  const targetDate = ensureValidDate(dateInput);
  const dateString = formatDate(targetDate);

  const [rows] = await pool.query(
    `SELECT ste.*, s.display_name AS student_name, s.login_name AS student_login_name,
            t.title AS task_title, t.points AS task_points
       FROM student_task_entries ste
       INNER JOIN users s ON ste.student_id = s.id
       INNER JOIN tasks t ON ste.task_id = t.id
      WHERE ste.parent_id = ? AND ste.entry_date = ?
      ORDER BY s.display_name IS NULL, s.display_name, s.login_name, ste.created_at`,
    [parentId, dateString]
  );

  const entryIds = rows.map((row) => row.id);
  const fileMap = await fetchFilesForEntryIds(entryIds);

  const entries = rows.map((row) =>
    mapEntryRow(row, fileMap.get(row.id) || [], {
      student: {
        id: row.student_id,
        name: row.student_name,
        loginName: row.student_login_name
      },
      task: {
        id: row.task_id,
        title: row.task_title,
        points: row.task_points
      }
    })
  );

  return { date: dateString, entries };
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

  const [files] = await pool.query(
    `SELECT *
       FROM student_task_entry_photos
      WHERE entry_id = ?
      ORDER BY created_at ASC`,
    [row.id]
  );

  return mapEntryRow(row, files);
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
            review_status = 'pending',
            reviewed_by = NULL,
            reviewed_at = NULL,
            started_at = ?,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND student_id = ?`,
    [newStatus, startedAt, entryId, studentId]
  );

  return getEntryById(entryId, studentId);
}

export async function countProofsForEntry(entryId, connection = pool) {
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

    const existingProofs = await countProofsForEntry(entryId, connection);
    const filesToPersist = Array.isArray(files) ? files : [];

    if (existingProofs + filesToPersist.length > config.uploads.maxPhotosPerEntry) {
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
              review_status = 'pending',
              reviewed_by = NULL,
              reviewed_at = NULL,
              review_notes = NULL,
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
        .map(() => '(?, ?, ?, ?)')
        .join(', ');
      const params = filesToPersist.flatMap((file) => [
        entryId,
        toPosixRelative(path.relative(config.uploads.baseDir, file.path)),
        file.originalname || null,
        file.mimetype || null
      ]);

      await connection.query(
        `INSERT INTO student_task_entry_photos (entry_id, file_path, original_name, file_type)
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

export async function approveEntryForParent({ parentId, entryId, note }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[entry]] = await connection.query(
      `SELECT ste.*, t.points AS task_points
         FROM student_task_entries ste
         INNER JOIN tasks t ON ste.task_id = t.id
        WHERE ste.id = ? AND ste.parent_id = ?
        LIMIT 1`,
      [entryId, parentId]
    );

    if (!entry) {
      throw new Error('ENTRY_NOT_FOUND');
    }
    if (entry.status !== 'completed') {
      throw new Error('ENTRY_NOT_COMPLETED');
    }
    if (entry.review_status === 'approved') {
      throw new Error('ENTRY_ALREADY_APPROVED');
    }

    const reviewNotes = note?.trim() || null;
    const now = new Date();

    await connection.query(
      `UPDATE student_task_entries
          SET review_status = 'approved',
              reviewed_by = ?,
              reviewed_at = ?,
              review_notes = ?
        WHERE id = ?`,
      [parentId, now, reviewNotes, entryId]
    );

    if (entry.task_points > 0) {
      try {
        await connection.query(
          `INSERT INTO student_points_history
             (parent_id, student_id, task_entry_id, task_id, points, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [parentId, entry.student_id, entryId, entry.task_id, entry.task_points, reviewNotes]
        );

        await connection.query(
          `UPDATE users
              SET points_balance = points_balance + ?
            WHERE id = ?`,
          [entry.task_points, entry.student_id]
        );
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') {
          throw error;
        }
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getParentEntryRow(parentId, entryId);
}

export async function rejectEntryForParent({ parentId, entryId, note }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[entry]] = await connection.query(
      `SELECT *
         FROM student_task_entries
        WHERE id = ? AND parent_id = ?
        LIMIT 1`,
      [entryId, parentId]
    );

    if (!entry) {
      throw new Error('ENTRY_NOT_FOUND');
    }
    if (entry.status !== 'completed') {
      throw new Error('ENTRY_NOT_COMPLETED');
    }
    if (entry.review_status === 'approved') {
      throw new Error('ENTRY_ALREADY_APPROVED');
    }

    const reviewNotes = note?.trim() || null;
    const now = new Date();

    await connection.query(
      `UPDATE student_task_entries
          SET status = 'pending',
              review_status = 'rejected',
              reviewed_by = ?,
              reviewed_at = ?,
              review_notes = ?,
              started_at = NULL,
              completed_at = NULL,
              duration_seconds = NULL,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [parentId, now, reviewNotes, entryId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getParentEntryRow(parentId, entryId);
}

export async function deleteEntryForParent({ parentId, entryId }) {
  const connection = await pool.getConnection();
  let proofFiles = [];

  try {
    await connection.beginTransaction();

    const [[entry]] = await connection.query(
      `SELECT review_status
         FROM student_task_entries
        WHERE id = ? AND parent_id = ?
        LIMIT 1`,
      [entryId, parentId]
    );

    if (!entry) {
      throw new Error('ENTRY_NOT_FOUND');
    }
    if (entry.review_status === 'approved') {
      throw new Error('ENTRY_ALREADY_APPROVED');
    }

    const [files] = await connection.query(
      'SELECT file_path FROM student_task_entry_photos WHERE entry_id = ?',
      [entryId]
    );
    proofFiles = files;

    await connection.query('DELETE FROM student_task_entry_photos WHERE entry_id = ?', [entryId]);
    await connection.query('DELETE FROM student_task_entries WHERE id = ?', [entryId]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  removeProofFiles(proofFiles);

  return { entryId };
}
