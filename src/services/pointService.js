import { pool } from '../db/pool.js';

const LEDGER_SOURCES = {
  TASK: 'task',
  MANUAL: 'manual',
  REWARD: 'reward_redeem'
};

function mapStudentSummary(row, aggregates = {}) {
  const studentAggregates = aggregates.get(row.id) ?? {
    earned: 0,
    spent: 0,
    lastActivity: null
  };

  return {
    id: row.id,
    loginName: row.login_name,
    displayName: row.display_name,
    pointsBalance: Number(row.points_balance),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    earnedTotal: studentAggregates.earned,
    spentTotal: studentAggregates.spent,
    lastActivityAt: studentAggregates.lastActivity
  };
}

function mapLedgerRow(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    studentId: row.student_id,
    taskEntryId: row.task_entry_id,
    taskId: row.task_id,
    rewardId: row.reward_id,
    points: Number(row.points),
    source: row.source,
    quantity: row.quantity === null ? null : Number(row.quantity),
    note: row.note,
    createdAt: row.created_at,
    taskTitle: row.task_title ?? null,
    rewardTitle: row.reward_title ?? null
  };
}

async function fetchStudentForParent(connection, parentId, studentId, { lock = false } = {}) {
  const lockClause = lock ? 'FOR UPDATE' : '';
  const [[student]] = await connection.query(
    `
      SELECT id, login_name, display_name, points_balance, created_at, updated_at
        FROM users
       WHERE id = ? AND parent_id = ?
       LIMIT 1
       ${lockClause}
    `,
    [studentId, parentId]
  );

  if (!student) {
    throw new Error('STUDENT_NOT_FOUND');
  }

  return student;
}

export async function listStudentPointsSummary(parentId) {
  const [studentRows, ledgerRows] = await Promise.all([
    pool
      .query(
        `
          SELECT id, login_name, display_name, points_balance, created_at, updated_at
            FROM users
           WHERE parent_id = ?
           ORDER BY display_name IS NULL, display_name ASC, created_at ASC
        `,
        [parentId]
      )
      .then(([rows]) => rows),
    pool
      .query(
        `
          SELECT student_id,
                 SUM(CASE WHEN points > 0 THEN points ELSE 0 END) AS earned,
                 SUM(CASE WHEN points < 0 THEN -points ELSE 0 END) AS spent,
                 MAX(created_at) AS lastActivity
            FROM student_points_history
           WHERE parent_id = ?
           GROUP BY student_id
        `,
        [parentId]
      )
      .then(([rows]) => rows)
  ]);

  const aggregateMap = new Map(
    ledgerRows.map((row) => [
      row.student_id,
      {
        earned: Number(row.earned ?? 0),
        spent: Number(row.spent ?? 0),
        lastActivity: row.lastActivity
      }
    ])
  );

  return studentRows.map((row) => mapStudentSummary(row, aggregateMap));
}

export async function listStudentLedgerEntries({
  parentId,
  studentId,
  limit = 100,
  since = null,
  sources = null,
  order = 'desc'
}) {
  const [[student]] = await pool.query(
    `
      SELECT id
        FROM users
       WHERE id = ? AND parent_id = ?
       LIMIT 1
    `,
    [studentId, parentId]
  );

  if (!student) {
    throw new Error('STUDENT_NOT_FOUND');
  }

  const conditions = ['sph.parent_id = ?', 'sph.student_id = ?'];
  const parameters = [parentId, studentId];

  if (since) {
    const sinceDate = new Date(since);
    if (Number.isNaN(sinceDate.getTime())) {
      throw new Error('INVALID_SINCE');
    }
    conditions.push('sph.created_at >= ?');
    parameters.push(sinceDate);
  }

  if (Array.isArray(sources) && sources.length > 0) {
    const allowed = sources
      .map((source) => String(source).trim())
      .filter((source) => Object.values(LEDGER_SOURCES).includes(source));

    if (allowed.length > 0) {
      conditions.push(`sph.source IN (${allowed.map(() => '?').join(', ')})`);
      parameters.push(...allowed);
    }
  }

  const sortDirection = order === 'asc' ? 'ASC' : 'DESC';
  let limitClause = '';

  if (Number.isInteger(limit) && limit > 0) {
    limitClause = 'LIMIT ?';
    parameters.push(limit);
  }

  const [rows] = await pool.query(
    `
      SELECT sph.*,
             t.title AS task_title,
             r.title AS reward_title
        FROM student_points_history sph
        LEFT JOIN tasks t ON sph.task_id = t.id
        LEFT JOIN reward_items r ON sph.reward_id = r.id
       WHERE ${conditions.join(`
         AND `)}
       ORDER BY sph.created_at ${sortDirection}, sph.id ${sortDirection}
       ${limitClause}
    `,
    parameters
  );

  return rows.map(mapLedgerRow);
}

async function insertLedgerEntry(connection, entry) {
  const [result] = await connection.query(
    `
      INSERT INTO student_points_history
        (parent_id, student_id, task_entry_id, task_id, reward_id, points, source, quantity, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      entry.parentId,
      entry.studentId,
      entry.taskEntryId ?? null,
      entry.taskId ?? null,
      entry.rewardId ?? null,
      entry.points,
      entry.source,
      entry.quantity ?? null,
      entry.note ?? null
    ]
  );

  const [[row]] = await connection.query(
    `
      SELECT sph.*,
             t.title AS task_title,
             r.title AS reward_title
        FROM student_points_history sph
        LEFT JOIN tasks t ON sph.task_id = t.id
        LEFT JOIN reward_items r ON sph.reward_id = r.id
       WHERE sph.id = ?
         AND sph.parent_id = ?
       LIMIT 1
    `,
    [result.insertId, entry.parentId]
  );

  return mapLedgerRow(row);
}

export async function adjustStudentPoints({ parentId, studentId, delta, note }) {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error('INVALID_DELTA');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const student = await fetchStudentForParent(connection, parentId, studentId, { lock: true });

    const nextBalance = Number(student.points_balance) + delta;
    if (nextBalance < 0) {
      throw new Error('INSUFFICIENT_POINTS');
    }

    const ledgerEntry = await insertLedgerEntry(connection, {
      parentId,
      studentId,
      points: delta,
      source: LEDGER_SOURCES.MANUAL,
      note: note?.trim() || null
    });

    await connection.query(
      `
        UPDATE users
           SET points_balance = points_balance + ?,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
      `,
      [delta, studentId]
    );

    await connection.commit();

    return {
      student: {
        id: studentId,
        pointsBalance: nextBalance
      },
      entry: ledgerEntry
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function redeemRewardForStudent({
  parentId,
  studentId,
  rewardId,
  quantity = 1,
  note
}) {
  const qty = Number.parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error('INVALID_QUANTITY');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const student = await fetchStudentForParent(connection, parentId, studentId, { lock: true });

    const [[reward]] = await connection.query(
      `
        SELECT id, title, points_cost, stock, is_active
          FROM reward_items
         WHERE id = ? AND parent_id = ?
         LIMIT 1
         FOR UPDATE
      `,
      [rewardId, parentId]
    );

    if (!reward) {
      throw new Error('REWARD_NOT_FOUND');
    }
    if (reward.is_active !== 1) {
      throw new Error('REWARD_INACTIVE');
    }

    const totalCost = Number(reward.points_cost) * qty;
    const currentBalance = Number(student.points_balance);
    if (currentBalance < totalCost) {
      throw new Error('INSUFFICIENT_POINTS');
    }

    if (reward.stock !== null) {
      const remaining = Number(reward.stock) - qty;
      if (remaining < 0) {
        throw new Error('INSUFFICIENT_STOCK');
      }
      await connection.query(
        `
          UPDATE reward_items
             SET stock = ?,
                 updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
        `,
        [remaining, rewardId]
      );
    }

    const ledgerEntry = await insertLedgerEntry(connection, {
      parentId,
      studentId,
      rewardId,
      points: -totalCost,
      source: LEDGER_SOURCES.REWARD,
      quantity: qty,
      note: note?.trim() || null
    });

    await connection.query(
      `
        UPDATE users
           SET points_balance = points_balance - ?,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
      `,
      [totalCost, studentId]
    );

    await connection.commit();

    return {
      student: {
        id: studentId,
        pointsBalance: currentBalance - totalCost
      },
      reward: {
        id: rewardId,
        remainingStock:
          reward.stock === null ? null : Math.max(0, Number(reward.stock) - qty)
      },
      entry: ledgerEntry
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function isLedgerSourceTask(source) {
  return source === LEDGER_SOURCES.TASK;
}

export function isLedgerSourceManual(source) {
  return source === LEDGER_SOURCES.MANUAL;
}

export function isLedgerSourceReward(source) {
  return source === LEDGER_SOURCES.REWARD;
}
