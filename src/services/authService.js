import { pool } from '../db/pool.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export async function findUserByLogin(loginName) {
  const [rows] = await pool.query(
    'SELECT id, role, login_name, email, display_name, password_hash, parent_id FROM users WHERE login_name = ? LIMIT 1',
    [loginName]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, role, login_name, email, display_name, parent_id, created_at
     FROM users WHERE id = ? LIMIT 1`,
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

export async function createStudentAccount({ parentId, loginName, password, displayName }) {
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
      `INSERT INTO users (role, login_name, display_name, password_hash, parent_id)\n       VALUES ('student', ?, ?, ?, ?)`,
      [loginName, displayName || null, passwordHash, parentId]
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
    `SELECT id, login_name, display_name, parent_id, created_at
     FROM users
     WHERE parent_id = ?
     ORDER BY created_at ASC`,
    [parentId]
  );
  return rows;
}

export async function updateStudentAccount({ parentId, studentId, loginName, password, displayName }) {
  const student = await findUserById(studentId);
  if (!student || student.role !== 'student' || student.parent_id !== parentId) {
    throw new Error('STUDENT_NOT_FOUND');
  }

  if (loginName && loginName !== student.login_name) {
    const existing = await findUserByLogin(loginName);
    if (existing && existing.id !== studentId) {
      throw new Error('LOGIN_NAME_TAKEN');
    }
  }

  const updates = [];
  const params = [];

  if (loginName) {
    updates.push('login_name = ?');
    params.push(loginName);
  }
  if (displayName !== undefined) {
    updates.push('display_name = ?');
    params.push(displayName || null);
  }
  if (password) {
    const passwordHash = await hashPassword(password);
    updates.push('password_hash = ?');
    params.push(passwordHash);
  }

  if (!updates.length) {
    return findUserById(studentId);
  }

  params.push(studentId, parentId);

  await pool.query(
    `UPDATE users
     SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND parent_id = ?`,
    params
  );

  return findUserById(studentId);
}

export async function deleteStudentAccount({ parentId, studentId }) {
  const [result] = await pool.query(
    `DELETE FROM users
     WHERE id = ? AND parent_id = ? AND role = 'student'`,
    [studentId, parentId]
  );

  if (result.affectedRows === 0) {
    throw new Error('STUDENT_NOT_FOUND');
  }
}


