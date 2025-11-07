import { pool } from '../db/pool.js';
import { ensureTaskSchedulingArtifacts } from '../db/schemaUpgrades.js';

const DEFAULT_PLAN_REWARD_POINTS = 0;

function normalizePoints(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_PLAN_REWARD_POINTS;
  }
  return parsed;
}

export async function getPlanRewardPoints(parentId, { connection: externalConnection = null } = {}) {
  await ensureTaskSchedulingArtifacts();
  const connection = externalConnection ?? pool;
  try {
    const [[row]] = await connection.query(
      `
        SELECT plan_reward_points
          FROM parent_settings
         WHERE parent_id = ?
         LIMIT 1
      `,
      [parentId]
    );
    if (!row) {
      return DEFAULT_PLAN_REWARD_POINTS;
    }
    return normalizePoints(row.plan_reward_points);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return DEFAULT_PLAN_REWARD_POINTS;
    }
    throw error;
  }
}

export async function savePlanRewardPoints(
  parentId,
  points,
  { connection: externalConnection = null } = {}
) {
  await ensureTaskSchedulingArtifacts();
  const normalizedPoints = normalizePoints(points);
  const connection = externalConnection ?? pool;
  try {
    await connection.query(
      `
        INSERT INTO parent_settings (parent_id, plan_reward_points, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          plan_reward_points = VALUES(plan_reward_points),
          updated_at = CURRENT_TIMESTAMP
      `,
      [parentId, normalizedPoints]
    );
    return normalizedPoints;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return normalizedPoints;
    }
    throw error;
  }
}
