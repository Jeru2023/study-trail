import { pool } from '../db/pool.js';

function mapReward(row) {
  if (!row) return null;
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    description: row.description,
    pointsCost: Number(row.points_cost),
    stock: row.stock === null ? null : Number(row.stock),
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listRewardsForParent(parentId) {
  const [rows] = await pool.query(
    `
      SELECT *
        FROM reward_items
       WHERE parent_id = ?
       ORDER BY updated_at DESC, id DESC
    `,
    [parentId]
  );
  return rows.map(mapReward);
}

export async function listRewardsForStudent(parentId) {
  const [rows] = await pool.query(
    `
      SELECT *
        FROM reward_items
       WHERE parent_id = ?
         AND is_active = 1
         AND (stock IS NULL OR stock > 0)
       ORDER BY points_cost ASC, title ASC
    `,
    [parentId]
  );
  return rows.map(mapReward);
}

export async function createRewardItem({
  parentId,
  title,
  description,
  pointsCost,
  stock,
  isActive
}) {
  const [result] = await pool.query(
    `
      INSERT INTO reward_items (parent_id, title, description, points_cost, stock, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [parentId, title, description ?? null, pointsCost, stock, isActive ? 1 : 0]
  );

  const [[row]] = await pool.query(
    `SELECT * FROM reward_items WHERE id = ?`,
    [result.insertId]
  );
  return mapReward(row);
}

export async function updateRewardItem({
  parentId,
  rewardId,
  title,
  description,
  pointsCost,
  stock,
  isActive
}) {
  const [result] = await pool.query(
    `
      UPDATE reward_items
         SET title = ?,
             description = ?,
             points_cost = ?,
             stock = ?,
             is_active = ?
       WHERE id = ? AND parent_id = ?
    `,
    [title, description ?? null, pointsCost, stock, isActive ? 1 : 0, rewardId, parentId]
  );

  if (result.affectedRows === 0) {
    throw new Error('REWARD_NOT_FOUND');
  }

  const [[row]] = await pool.query(
    `SELECT * FROM reward_items WHERE id = ?`,
    [rewardId]
  );
  return mapReward(row);
}

export async function deleteRewardItem({ parentId, rewardId }) {
  const [result] = await pool.query(
    `DELETE FROM reward_items WHERE id = ? AND parent_id = ?`,
    [rewardId, parentId]
  );

  if (result.affectedRows === 0) {
    throw new Error('REWARD_NOT_FOUND');
  }
}
