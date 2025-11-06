import { pool } from '../db/pool.js';
import { ensureTaskSchedulingArtifacts } from '../db/schemaUpgrades.js';

export const PLAN_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const SUBMITTABLE_STATUSES = new Set([PLAN_STATUS.DRAFT, PLAN_STATUS.REJECTED]);

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateString(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
    if (Number.isNaN(date.getTime())) {
      throw new Error('INVALID_DATE');
    }
    return date;
  }

  const fallback = new Date(trimmed);
  if (Number.isNaN(fallback.getTime())) {
    throw new Error('INVALID_DATE');
  }
  return fallback;
}

function normalizePlanDate(value) {
  const baseDate = value ? parseDateString(value) : new Date();
  return formatDate(baseDate);
}

function mapPlanRow(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    parentId: row.parent_id,
    studentId: row.student_id,
    planDate: row.plan_date,
    status: row.status,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    rejectedAt: row.rejected_at,
    rejectedBy: row.rejected_by,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extras
  };
}

function mapPlanItemRow(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    taskId: row.task_id,
    title: row.title,
    sortOrder: row.sort_order,
    taskTitle: row.task_title || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function fetchStudentWithParent(connection, studentId) {
  const [[student]] = await connection.query(
    `
      SELECT id, parent_id
        FROM users
       WHERE id = ? AND role = 'student'
       LIMIT 1
    `,
    [studentId]
  );
  if (!student) {
    throw new Error('STUDENT_NOT_FOUND');
  }
  if (!student.parent_id) {
    throw new Error('PARENT_NOT_LINKED');
  }
  return student;
}

async function ensureTasksAssigned(connection, { studentId, parentId, planDate, taskIds }) {
  if (!taskIds.length) return;

  const [assignments] = await connection.query(
    `
      SELECT st.task_id, t.start_date, t.end_date
        FROM student_tasks st
        INNER JOIN tasks t ON t.id = st.task_id
       WHERE st.student_id = ?
         AND st.parent_id = ?
         AND st.task_id IN (?)
    `,
    [studentId, parentId, taskIds]
  );

  if (assignments.length !== taskIds.length) {
    throw new Error('TASK_NOT_ASSIGNED');
  }

  assignments.forEach((assignment) => {
    if (assignment.start_date && planDate < assignment.start_date) {
      throw new Error('TASK_NOT_AVAILABLE');
    }
    if (assignment.end_date && planDate > assignment.end_date) {
      throw new Error('TASK_NOT_AVAILABLE');
    }
  });
}

function validateAndNormalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => {
    const taskId = Number.parseInt(item?.taskId, 10);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      throw new Error('ITEM_TASK_REQUIRED');
    }
    const title = String(item?.title ?? '').trim();
    if (!title) {
      throw new Error('ITEM_TITLE_REQUIRED');
    }
    const sortOrderRaw = Number.parseInt(item?.sortOrder, 10);
    const sortOrder = Number.isInteger(sortOrderRaw) && sortOrderRaw >= 0 ? sortOrderRaw : index + 1;
    return {
      taskId,
      title,
      sortOrder
    };
  });
}

async function loadPlanWithItems(connection, planRow) {
  if (!planRow) return null;

  const [items] = await connection.query(
    `
      SELECT dpi.*, t.title AS task_title
        FROM daily_plan_items dpi
        LEFT JOIN tasks t ON t.id = dpi.task_id
       WHERE dpi.plan_id = ?
       ORDER BY dpi.sort_order ASC, dpi.id ASC
    `,
    [planRow.id]
  );

  return {
    ...mapPlanRow(planRow),
    items: items.map(mapPlanItemRow)
  };
}

async function loadPlanById(connection, planId) {
  const [[planRow]] = await connection.query(
    `
      SELECT dp.*, s.display_name AS student_name
        FROM daily_plans dp
        INNER JOIN users s ON s.id = dp.student_id
       WHERE dp.id = ?
       LIMIT 1
    `,
    [planId]
  );
  const plan = await loadPlanWithItems(connection, planRow);
  if (plan) {
    plan.studentName = planRow.student_name || null;
  }
  return plan;
}

async function loadPlanForStudent(connection, studentId, planDate) {
  const [[planRow]] = await connection.query(
    `
      SELECT *
        FROM daily_plans
       WHERE student_id = ? AND plan_date = ?
       LIMIT 1
    `,
    [studentId, planDate]
  );
  if (planRow) {
    return loadPlanWithItems(connection, planRow);
  }

  const [[legacyRow]] = await connection.query(
    `
      SELECT *
        FROM daily_plans
       WHERE student_id = ?
         AND plan_date BETWEEN DATE_SUB(?, INTERVAL 3 DAY) AND DATE_ADD(?, INTERVAL 3 DAY)
       ORDER BY plan_date DESC
       LIMIT 1
    `,
    [studentId, planDate, planDate]
  );

  if (!legacyRow) {
    return null;
  }

  const requestedDate = parseDateString(planDate);
  const legacyDate = parseDateString(legacyRow.plan_date);
  if (!requestedDate || !legacyDate) {
    return loadPlanWithItems(connection, legacyRow);
  }

  const diffDays = Math.abs(requestedDate - legacyDate) / (1000 * 60 * 60 * 24);
  if (diffDays > 2) {
    return loadPlanWithItems(connection, legacyRow);
  }

  await connection.query(
    `
      UPDATE daily_plans
         SET plan_date = ?,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
    `,
    [planDate, legacyRow.id]
  );

  return loadPlanById(connection, legacyRow.id);
}

export async function getStudentDailyPlan(studentId, planDateInput) {
  await ensureTaskSchedulingArtifacts();
  const planDate = normalizePlanDate(planDateInput);
  const connection = await pool.getConnection();
  try {
    await fetchStudentWithParent(connection, studentId);
    const plan = await loadPlanForStudent(connection, studentId, planDate);
    return {
      planDate,
      plan
    };
  } finally {
    connection.release();
  }
}

export async function saveStudentDailyPlan({ studentId, planDate: planDateInput, items, submit = false }) {
  await ensureTaskSchedulingArtifacts();

  const planDate = normalizePlanDate(planDateInput);
  const normalizedItems = validateAndNormalizeItems(items);
  if (submit && normalizedItems.length === 0) {
    throw new Error('PLAN_ITEMS_REQUIRED');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const student = await fetchStudentWithParent(connection, studentId);
    const parentId = student.parent_id;

    const uniqueTaskIds = [...new Set(normalizedItems.map((item) => item.taskId))];
    await ensureTasksAssigned(connection, {
      studentId,
      parentId,
      planDate,
      taskIds: uniqueTaskIds
    });

    const [[existingPlan]] = await connection.query(
      `
        SELECT *
          FROM daily_plans
         WHERE student_id = ? AND plan_date = ?
         FOR UPDATE
      `,
      [studentId, planDate]
    );

    if (existingPlan) {
      if (existingPlan.status === PLAN_STATUS.APPROVED) {
        throw new Error('PLAN_LOCKED');
      }
      if (existingPlan.status === PLAN_STATUS.SUBMITTED) {
        throw new Error('PLAN_IN_REVIEW');
      }
    }

    let planId;
    const nextStatus = submit ? PLAN_STATUS.SUBMITTED : PLAN_STATUS.DRAFT;

    if (existingPlan) {
      planId = existingPlan.id;
      await connection.query('DELETE FROM daily_plan_items WHERE plan_id = ?', [planId]);
      await connection.query(
        `
          UPDATE daily_plans
             SET status = ?,
                 submitted_at = ?,
                 approved_at = NULL,
                 approved_by = NULL,
                 rejected_at = NULL,
                 rejected_by = NULL,
                 rejection_reason = NULL,
                 updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
        `,
        [nextStatus, submit ? new Date() : null, planId]
      );
    } else {
      const [result] = await connection.query(
        `
          INSERT INTO daily_plans
            (parent_id, student_id, plan_date, status, submitted_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        [parentId, studentId, planDate, nextStatus, submit ? new Date() : null]
      );
      planId = result.insertId;
    }

    if (normalizedItems.length > 0) {
      const values = normalizedItems.map((item) => [planId, item.taskId, item.title, item.sortOrder]);
      await connection.query(
        `
          INSERT INTO daily_plan_items
            (plan_id, task_id, title, sort_order)
          VALUES ?
        `,
        [values]
      );
    }

    const plan = await loadPlanById(connection, planId);
    await connection.commit();
    return plan;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function submitStudentDailyPlan({ studentId, planDate: planDateInput }) {
  await ensureTaskSchedulingArtifacts();
  const planDate = normalizePlanDate(planDateInput);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await fetchStudentWithParent(connection, studentId);

    const [[planRow]] = await connection.query(
      `
        SELECT *
          FROM daily_plans
         WHERE student_id = ? AND plan_date = ?
         FOR UPDATE
      `,
      [studentId, planDate]
    );

    if (!planRow) {
      throw new Error('PLAN_NOT_FOUND');
    }
    if (!SUBMITTABLE_STATUSES.has(planRow.status)) {
      if (planRow.status === PLAN_STATUS.SUBMITTED) {
        throw new Error('PLAN_ALREADY_SUBMITTED');
      }
      throw new Error('PLAN_LOCKED');
    }

    const [[itemCount]] = await connection.query(
      `
        SELECT COUNT(1) AS total
          FROM daily_plan_items
         WHERE plan_id = ?
      `,
      [planRow.id]
    );

    if (!Number(itemCount.total)) {
      throw new Error('PLAN_ITEMS_REQUIRED');
    }

    await connection.query(
      `
        UPDATE daily_plans
           SET status = ?,
               submitted_at = CURRENT_TIMESTAMP,
               approved_at = NULL,
               approved_by = NULL,
               rejected_at = NULL,
               rejected_by = NULL,
               rejection_reason = NULL,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
      `,
      [PLAN_STATUS.SUBMITTED, planRow.id]
    );

    const plan = await loadPlanById(connection, planRow.id);
    await connection.commit();
    return plan;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function normalizeStatusFilter(value) {
  if (!value) return null;
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'pending') return PLAN_STATUS.SUBMITTED;
  if (Object.values(PLAN_STATUS).includes(trimmed)) {
    return trimmed;
  }
  throw new Error('INVALID_STATUS');
}

export async function listParentDailyPlans({ parentId, status }) {
  await ensureTaskSchedulingArtifacts();
  const normalizedStatus = normalizeStatusFilter(status);

  const connection = await pool.getConnection();
  try {
    const conditions = ['dp.parent_id = ?'];
    const params = [parentId];

    if (normalizedStatus) {
      conditions.push('dp.status = ?');
      params.push(normalizedStatus);
    }

    const [rows] = await connection.query(
      `
        SELECT dp.*, s.display_name AS student_name
          FROM daily_plans dp
          INNER JOIN users s ON s.id = dp.student_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY dp.plan_date DESC, dp.created_at DESC
      `,
      params
    );

    if (!rows.length) {
      return [];
    }

    const planIds = rows.map((row) => row.id);
    const [items] = await connection.query(
      `
        SELECT dpi.*, t.title AS task_title
          FROM daily_plan_items dpi
          LEFT JOIN tasks t ON t.id = dpi.task_id
         WHERE dpi.plan_id IN (?)
         ORDER BY dpi.plan_id, dpi.sort_order ASC, dpi.id ASC
      `,
      [planIds]
    );

    const groupedItems = new Map();
    items.forEach((item) => {
      const entry = mapPlanItemRow(item);
      if (!groupedItems.has(item.plan_id)) {
        groupedItems.set(item.plan_id, []);
      }
      groupedItems.get(item.plan_id).push(entry);
    });

    return rows.map((row) =>
      mapPlanRow(row, {
        studentName: row.student_name || null,
        items: groupedItems.get(row.id) || []
      })
    );
  } finally {
    connection.release();
  }
}

export async function getParentDailyPlan({ parentId, planId }) {
  await ensureTaskSchedulingArtifacts();
  const connection = await pool.getConnection();
  try {
    const [[planRow]] = await connection.query(
      `
        SELECT dp.*, s.display_name AS student_name
          FROM daily_plans dp
          INNER JOIN users s ON s.id = dp.student_id
         WHERE dp.parent_id = ? AND dp.id = ?
         LIMIT 1
      `,
      [parentId, planId]
    );

    if (!planRow) {
      throw new Error('PLAN_NOT_FOUND');
    }

    const plan = await loadPlanWithItems(connection, planRow);
    if (plan) {
      plan.studentName = planRow.student_name || null;
    }
    return plan;
  } finally {
    connection.release();
  }
}

export async function approveDailyPlan({ parentId, planId }) {
  await ensureTaskSchedulingArtifacts();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[planRow]] = await connection.query(
      `
        SELECT *
          FROM daily_plans
         WHERE parent_id = ? AND id = ?
         FOR UPDATE
      `,
      [parentId, planId]
    );

    if (!planRow) {
      throw new Error('PLAN_NOT_FOUND');
    }
    if (planRow.status !== PLAN_STATUS.SUBMITTED) {
      if (planRow.status === PLAN_STATUS.APPROVED) {
        throw new Error('PLAN_ALREADY_APPROVED');
      }
      throw new Error('PLAN_NOT_SUBMITTED');
    }

    await connection.query(
      `
        UPDATE daily_plans
           SET status = ?,
               approved_at = CURRENT_TIMESTAMP,
               approved_by = ?,
               rejected_at = NULL,
               rejected_by = NULL,
               rejection_reason = NULL,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
      `,
      [PLAN_STATUS.APPROVED, parentId, planRow.id]
    );

    const plan = await loadPlanById(connection, planRow.id);
    await connection.commit();
    return plan;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function rejectDailyPlan({ parentId, planId, reason }) {
  await ensureTaskSchedulingArtifacts();
  const trimmedReason = reason ? String(reason).trim().slice(0, 255) : null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[planRow]] = await connection.query(
      `
        SELECT *
          FROM daily_plans
         WHERE parent_id = ? AND id = ?
         FOR UPDATE
      `,
      [parentId, planId]
    );

    if (!planRow) {
      throw new Error('PLAN_NOT_FOUND');
    }
    if (planRow.status !== PLAN_STATUS.SUBMITTED) {
      if (planRow.status === PLAN_STATUS.APPROVED) {
        throw new Error('PLAN_ALREADY_APPROVED');
      }
      throw new Error('PLAN_NOT_SUBMITTED');
    }

    await connection.query(
      `
        UPDATE daily_plans
           SET status = ?,
               rejected_at = CURRENT_TIMESTAMP,
               rejected_by = ?,
               rejection_reason = ?,
               approved_at = NULL,
               approved_by = NULL,
               submitted_at = NULL,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
      `,
      [PLAN_STATUS.REJECTED, parentId, trimmedReason, planRow.id]
    );

    const plan = await loadPlanById(connection, planRow.id);
    await connection.commit();
    return plan;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
