import { pool } from '../db/pool.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export async function findUserByLogin(loginName) {
  const [rows] = await pool.query(
    'SELECT id, role, login_name, email, password_hash, parent_id FROM users WHERE login_name = ? LIMIT 1',
    [loginName]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, role, login_name, email, parent_id, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

export async function createParentAccount({ loginName, email, password }) {
  const existing = await findUserByLogin(loginName);
  if (existing) {
    throw new Error('LOGIN_NAME_TAKEN');
  }

  const passwordHash = await hashPassword(password);

  try {
    const [result] = await pool.query(
      `INSERT INTO users (role, login_name, email, password_hash)
       VALUES ('parent', ?, ?, ?)`,
      [loginName, email, passwordHash]
    );

    return findUserById(result.insertId);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('uniq_email')) {
        throw new Error('EMAIL_TAKEN');
      }
      if (error.message.includes('uniq_login_name')) {
        throw new Error('LOGIN_NAME_TAKEN');
      }
    }
    throw error;
  }
}

export async function createStudentAccount({ parentId, loginName, password }) {
  const parent = await findUserById(parentId);
  if (!parent || parent.role !== 'parent') {
    throw new Error('PARENT_NOT_FOUND');
  }

  const existing = await findUserByLogin(loginName);
  if (existing) {
    throw new Error('LOGIN_NAME_TAKEN');
  }

  const passwordHash = await hashPassword(password);

  try {
    const [result] = await pool.query(
      `INSERT INTO users (role, login_name, password_hash, parent_id)
       VALUES ('student', ?, ?, ?)`,
      [loginName, passwordHash, parentId]
    );

    return findUserById(result.insertId);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('uniq_login_name')) {
      throw new Error('LOGIN_NAME_TAKEN');
    }
    throw error;
  }
}

export async function authenticateUser({ role, loginName, password }) {
  const user = await findUserByLogin(loginName);
  if (!user || user.role !== role) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  return user;
}

export async function listStudentsForParent(parentId) {
  const [rows] = await pool.query(
    `SELECT id, login_name, created_at
     FROM users
     WHERE parent_id = ?
     ORDER BY created_at ASC`,
    [parentId]
  );
  return rows;
}
