import dayjs from 'dayjs';
import { pool } from '../db/pool.js';

const SOURCE_KEYS = ['task', 'manual', 'reward_redeem'];

function createRange(key, start, end) {
  return {
    key,
    start,
    end,
    startValue: start.valueOf(),
    endValue: end.valueOf(),
    students: new Map()
  };
}

function createEmptyStudentAggregate(row) {
  return {
    studentId: row.student_id,
    displayName: row.display_name ?? null,
    loginName: row.login_name,
    totals: {
      task: 0,
      manual: 0,
      reward_redeem: 0
    },
    netPoints: 0,
    earnedPoints: 0,
    spentPoints: 0,
    lastActivityAt: null
  };
}

function createEmptySourceTotals() {
  return {
    net: 0,
    earned: 0,
    spent: 0
  };
}

function createEmptyDailyTotals() {
  return {
    task: 0,
    manual: 0,
    reward_redeem: 0,
    earned: 0,
    spent: 0,
    net: 0
  };
}

function toIsoString(value) {
  if (!value) return null;
  const date = dayjs(value);
  if (!date.isValid()) return null;
  return date.toISOString();
}

function sortLeaderboardEntries(a, b) {
  if (b.netPoints !== a.netPoints) {
    return b.netPoints - a.netPoints;
  }
  if (b.earnedPoints !== a.earnedPoints) {
    return b.earnedPoints - a.earnedPoints;
  }
  const nameA = a.displayName ?? a.loginName ?? '';
  const nameB = b.displayName ?? b.loginName ?? '';
  return nameA.localeCompare(nameB, 'zh');
}

export async function getPointsDashboard(parentId) {
  const now = dayjs();
  const startOfToday = now.startOf('day');
  const endOfToday = startOfToday.add(1, 'day');

  const ranges = {
    today: createRange('today', startOfToday, endOfToday),
    week: createRange('week', startOfToday.subtract(6, 'day'), endOfToday),
    month: createRange('month', startOfToday.subtract(29, 'day'), endOfToday)
  };

  const monthStartDate = ranges.month.start.toDate();

  const [rows, studentRows] = await Promise.all([
    pool
      .query(
        `
          SELECT
            sph.id,
            sph.student_id,
            sph.points,
            sph.source,
            sph.created_at,
            sph.task_id,
            t.title AS task_title,
            u.display_name,
            u.login_name
          FROM student_points_history AS sph
          JOIN users AS u ON u.id = sph.student_id
          LEFT JOIN tasks AS t ON t.id = sph.task_id
          WHERE sph.parent_id = ?
            AND sph.created_at >= ?
          ORDER BY sph.created_at ASC, sph.id ASC
        `,
        [parentId, monthStartDate]
      )
      .then(([result]) => result),
    pool
      .query(
        `
          SELECT id, login_name, display_name, created_at
            FROM users
           WHERE parent_id = ?
           ORDER BY display_name IS NULL, display_name ASC, created_at ASC
        `,
        [parentId]
      )
      .then(([result]) => result)
  ]);

  const sourceBreakdown = {
    task: createEmptySourceTotals(),
    manual: createEmptySourceTotals(),
    reward_redeem: createEmptySourceTotals()
  };
  const dailyMap = new Map();
  const taskTotals = new Map();

  let totalEarned = 0;
  let totalSpent = 0;

  for (const row of rows) {
    const createdAt = dayjs(row.created_at);
    if (!createdAt.isValid()) {
      // Skip malformed timestamps to avoid contaminating aggregates.
      // eslint-disable-next-line no-continue
      continue;
    }

    const points = Number(row.points) || 0;
    const source = SOURCE_KEYS.includes(row.source) ? row.source : 'manual';
    const timestamp = createdAt.valueOf();
    const dateKey = createdAt.format('YYYY-MM-DD');

    const dailyTotals = dailyMap.get(dateKey) ?? createEmptyDailyTotals();
    dailyTotals[source] += points;
    dailyTotals.net += points;
    if (points > 0) {
      dailyTotals.earned += points;
    } else if (points < 0) {
      dailyTotals.spent += Math.abs(points);
    }
    dailyMap.set(dateKey, dailyTotals);

    const sourceTotals = sourceBreakdown[source] ?? createEmptySourceTotals();
    sourceTotals.net += points;
    if (points > 0) {
      sourceTotals.earned += points;
      totalEarned += points;
    } else if (points < 0) {
      const spentAbs = Math.abs(points);
      sourceTotals.spent += spentAbs;
      totalSpent += spentAbs;
    }
    sourceBreakdown[source] = sourceTotals;

    if (row.task_id && points > 0) {
      const current = taskTotals.get(row.task_id) ?? {
        taskId: row.task_id,
        title: row.task_title ?? '未命名任务',
        points: 0
      };
      current.points += points;
      if (row.task_title) {
        current.title = row.task_title;
      }
      taskTotals.set(row.task_id, current);
    }

    for (const range of Object.values(ranges)) {
      if (timestamp < range.startValue || timestamp >= range.endValue) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const map = range.students;
      let aggregate = map.get(row.student_id);
      if (!aggregate) {
        aggregate = createEmptyStudentAggregate(row);
        map.set(row.student_id, aggregate);
      }

      aggregate.totals[source] += points;
      aggregate.netPoints += points;
      if (points > 0) {
        aggregate.earnedPoints += points;
      } else if (points < 0) {
        aggregate.spentPoints += Math.abs(points);
      }

      if (!aggregate.lastActivityAt || createdAt.valueOf() > dayjs(aggregate.lastActivityAt).valueOf()) {
        aggregate.lastActivityAt = createdAt.toISOString();
      }
    }
  }

  const rangeResults = {};

  for (const [key, range] of Object.entries(ranges)) {
    const leaderboard = Array.from(range.students.values()).sort(sortLeaderboardEntries);

    const totals = leaderboard.reduce(
      (acc, entry) => {
        acc.net += entry.netPoints;
        acc.earned += entry.earnedPoints;
        acc.spent += entry.spentPoints;
        return acc;
      },
      { net: 0, earned: 0, spent: 0 }
    );

    rangeResults[key] = {
      key,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      leaderboard,
      totals
    };
  }

  const monthLeaderboard = rangeResults.month.leaderboard;
  const activeStudents = monthLeaderboard.length;
  const topStudent = monthLeaderboard[0] ?? null;
  const topTask = Array.from(taskTotals.values()).sort((a, b) => b.points - a.points)[0] ?? null;

  const rangeDays = Math.max(
    1,
    Math.round(ranges.month.end.diff(ranges.month.start, 'day', true))
  );
  const avgDailyPoints = Math.round(totalEarned / rangeDays) || 0;

  const dailyTrend = [];
  for (
    let cursor = ranges.month.start.clone();
    cursor.isBefore(ranges.month.end);
    cursor = cursor.add(1, 'day')
  ) {
    const key = cursor.format('YYYY-MM-DD');
    const totals = dailyMap.get(key) ?? createEmptyDailyTotals();
    dailyTrend.push({
      date: key,
      totals: {
        task: totals.task,
        manual: totals.manual,
        reward_redeem: totals.reward_redeem
      },
      earned: totals.earned,
      spent: totals.spent,
      net: totals.net
    });
  }

  return {
    generatedAt: now.toISOString(),
    ranges: rangeResults,
    students: studentRows.map((row) => ({
      id: row.id,
      loginName: row.login_name,
      displayName: row.display_name
    })),
    summaryCards: {
      totalIssued: {
        value: totalEarned
      },
      manualAdjustments: {
        value: sourceBreakdown.manual.net
      },
      redeemed: {
        value: sourceBreakdown.reward_redeem.spent
      },
      activeStudents: {
        value: activeStudents
      },
      averageDailyPoints: {
        value: avgDailyPoints
      },
      topTask: topTask
        ? {
            taskId: topTask.taskId,
            title: topTask.title,
            points: topTask.points
          }
        : null,
      topStudent: topStudent
        ? {
            studentId: topStudent.studentId,
            displayName: topStudent.displayName,
            loginName: topStudent.loginName,
            netPoints: topStudent.netPoints
          }
        : null
    },
    trend: {
      start: ranges.month.start.toISOString(),
      end: ranges.month.end.toISOString(),
      daily: dailyTrend
    },
    sourceBreakdown: {
      task: sourceBreakdown.task,
      manual: sourceBreakdown.manual,
      reward_redeem: sourceBreakdown.reward_redeem
    },
    metadata: {
      rangeDays,
      studentCount: activeStudents,
      totalStudents: studentRows.length
    }
  };
}

export async function getStudentPointsHistory({
  parentId,
  studentId,
  since,
  sources
}) {
  const historyStart = since ? dayjs(since) : dayjs().startOf('day').subtract(89, 'day');
  if (!historyStart.isValid()) {
    throw new Error('INVALID_SINCE');
  }

  const sinceDate = historyStart.toDate();
  const allowedSources =
    Array.isArray(sources) && sources.length > 0
      ? sources.filter((source) => SOURCE_KEYS.includes(source))
      : null;

  const [[studentRow]] = await pool.query(
    `
      SELECT id, login_name, display_name, points_balance
        FROM users
       WHERE id = ? AND parent_id = ?
       LIMIT 1
    `,
    [studentId, parentId]
  );

  if (!studentRow) {
    throw new Error('STUDENT_NOT_FOUND');
  }

  const [ledgerRows] = await pool.query(
    `
      SELECT sph.*,
             t.title AS task_title,
             r.title AS reward_title
        FROM student_points_history sph
        LEFT JOIN tasks t ON sph.task_id = t.id
        LEFT JOIN reward_items r ON sph.reward_id = r.id
       WHERE sph.parent_id = ?
         AND sph.student_id = ?
         AND sph.created_at >= ?
         ${allowedSources && allowedSources.length > 0 ? `AND sph.source IN (${allowedSources.map(() => '?').join(', ')})` : ''}
       ORDER BY sph.created_at DESC, sph.id DESC
    `,
    allowedSources && allowedSources.length > 0
      ? [parentId, studentId, sinceDate, ...allowedSources]
      : [parentId, studentId, sinceDate]
  );

  const entries = ledgerRows.map((row) => ({
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
  }));

  const totals = {
    task: createEmptySourceTotals(),
    manual: createEmptySourceTotals(),
    reward_redeem: createEmptySourceTotals()
  };
  const dailyTrend = new Map();

  for (const entry of entries) {
    const sourceKey = SOURCE_KEYS.includes(entry.source) ? entry.source : 'manual';
    const bucket = totals[sourceKey];
    bucket.net += entry.points;
    if (entry.points > 0) {
      bucket.earned += entry.points;
    } else if (entry.points < 0) {
      bucket.spent += Math.abs(entry.points);
    }

    const dateKey = dayjs(entry.createdAt).format('YYYY-MM-DD');
    const existing = dailyTrend.get(dateKey) ?? createEmptyDailyTotals();
    existing[sourceKey] += entry.points;
    existing.net += entry.points;
    if (entry.points > 0) {
      existing.earned += entry.points;
    } else if (entry.points < 0) {
      existing.spent += Math.abs(entry.points);
    }
    dailyTrend.set(dateKey, existing);
  }

  const daysWindow = dayjs().startOf('day').diff(historyStart, 'day') + 1;
  const dailySeries = [];
  for (let i = 0; i < daysWindow; i += 1) {
    const cursor = historyStart.add(i, 'day');
    const key = cursor.format('YYYY-MM-DD');
    const totalsForDay = dailyTrend.get(key) ?? createEmptyDailyTotals();
    dailySeries.push({
      date: key,
      totals: {
        task: totalsForDay.task,
        manual: totalsForDay.manual,
        reward_redeem: totalsForDay.reward_redeem
      },
      earned: totalsForDay.earned,
      spent: totalsForDay.spent,
      net: totalsForDay.net
    });
  }

  return {
    student: {
      id: studentRow.id,
      loginName: studentRow.login_name,
      displayName: studentRow.display_name,
      pointsBalance: Number(studentRow.points_balance)
    },
    since: toIsoString(historyStart),
    generatedAt: dayjs().toISOString(),
    totals,
    daily: dailySeries,
    entries
  };
}
