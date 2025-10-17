import {
  authenticateUser,
  createParentAccount,
  createStudentAccount,
  listStudentsForParent
} from '../services/authService.js';

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    role: user.role,
    loginName: user.login_name,
    email: user.email || null,
    parentId: user.parent_id || null
  };
}

export async function registerParent(req, res) {
  try {
    const { loginName, email, password } = req.body;

    if (!loginName || !email || !password) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const parent = await createParentAccount({ loginName, email, password });

    return res.status(201).json({ user: sanitizeUser(parent) });
  } catch (error) {
    if (error.message === 'LOGIN_NAME_TAKEN') {
      return res.status(409).json({ message: '登录名已被占用' });
    }
    return res.status(500).json({ message: '注册失败', detail: error.message });
  }
}

export async function login(req, res) {
  try {
    const { role, loginName, password } = req.body;
    if (!role || !loginName || !password) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const user = await authenticateUser({ role, loginName, password });

    req.session.user = {
      id: user.id,
      role: user.role,
      loginName: user.login_name
    };

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ message: '账号或密码错误' });
    }
    return res.status(500).json({ message: '登录失败', detail: error.message });
  }
}

export function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
}

export async function createStudent(req, res) {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser || sessionUser.role !== 'parent') {
      return res.status(403).json({ message: '没有权限' });
    }

    const { loginName, password } = req.body;
    if (!loginName || !password) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const student = await createStudentAccount({
      parentId: sessionUser.id,
      loginName,
      password
    });

    return res.status(201).json({ student: sanitizeUser(student) });
  } catch (error) {
    if (error.message === 'LOGIN_NAME_TAKEN') {
      return res.status(409).json({ message: '学生登录名已存在' });
    }
    if (error.message === 'PARENT_NOT_FOUND') {
      return res.status(404).json({ message: '家长信息不存在' });
    }
    return res.status(500).json({ message: '创建学生账号失败', detail: error.message });
  }
}

export async function getMyStudents(req, res) {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser || sessionUser.role !== 'parent') {
      return res.status(403).json({ message: '没有权限' });
    }

    const students = await listStudentsForParent(sessionUser.id);

    return res.json({
      students: students.map((student) => sanitizeUser(student))
    });
  } catch (error) {
    return res.status(500).json({ message: '获取学生列表失败', detail: error.message });
  }
}
