import { pool } from '../db/pool.js';
import { ensureTaskSchedulingArtifacts } from '../db/schemaUpgrades.js';

function aggregateAssignments(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const studentId = row.student_id;
    if (!map.has(studentId)) {
      map.set(studentId, {
        student: {
          id: studentId,
          name: row.student_name || row.student_login_name || '',
          loginName: row.student_login_name || ''
        },
        tasks: [],
        taskIds: []
      });
    }
    const entry = map.get(studentId);
    entry.tasks.push({
      id: row.task_id,
      title: row.task_title,
      points: row.task_points,
      scheduleType: row.task_schedule_type,
      recurringDayOfWeek: row.task_recurring_day
    });
    entry.taskIds.push(row.task_id);
  });

  return Array.from(map.values());
}

export async function listAssignmentsByParent(parentId) {
  await ensureTaskSchedulingArtifacts();
  const [rows] = await pool.query(
    `SELECT
       st.student_id,
       st.task_id,
       s.display_name AS student_name,
       s.login_name AS student_login_name,
       t.title AS task_title,
       t.points AS task_points,
       t.schedule_type AS task_schedule_type,
       t.recurring_day_of_week AS task_recurring_day
     FROM student_tasks st
     INNER JOIN users s ON st.student_id = s.id AND s.role = 'student'
     INNER JOIN tasks t ON st.task_id = t.id
     WHERE st.parent_id = ?
     ORDER BY s.display_name IS NULL, s.display_name, s.login_name, t.created_at DESC`,
    [parentId]
  );

  return aggregateAssignments(rows);
}

export async function setAssignmentsForStudent(parentId, studentId, taskIds) {
  const normalizedTaskIds = Array.isArray(taskIds)
    ? Array.from(
        new Set(
          taskIds
            .map((value) => Number.parseInt(String(value).trim(), 10))
            .filter((value) => Number.isInteger(value) && value > 0)
        )
      )
    : [];

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[student]] = await connection.query(
      `SELECT id
         FROM users
        WHERE id = ? AND parent_id = ? AND role = 'student'
        LIMIT 1`,
      [studentId, parentId]
    );

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    if (normalizedTaskIds.length) {
      const [validTasks] = await connection.query(
        `SELECT id
           FROM tasks
          WHERE parent_id = ? AND id IN (?)
          ORDER BY id`,
        [parentId, normalizedTaskIds]
      );
      if (validTasks.length !== normalizedTaskIds.length) {
        throw new Error('TASK_NOT_FOUND');
      }
    }

    await connection.query(
      'DELETE FROM student_tasks WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    if (normalizedTaskIds.length) {
      const placeholders = normalizedTaskIds.map(() => '(?, ?, ?)').join(', ');
      const params = normalizedTaskIds.flatMap((taskId) => [parentId, studentId, taskId]);

      await connection.query(
        `INSERT INTO student_tasks (parent_id, student_id, task_id)
         VALUES ${placeholders}`,
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

  return listAssignmentsByParent(parentId);
}

export async function clearAssignmentsForStudent(parentId, studentId) {
  const [result] = await pool.query(
    'DELETE FROM student_tasks WHERE parent_id = ? AND student_id = ?',
    [parentId, studentId]
  );
  return result.affectedRows > 0;
}
