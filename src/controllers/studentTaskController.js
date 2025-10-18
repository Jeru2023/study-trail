import {
  clearAssignmentsForStudent,
  listAssignmentsByParent,
  setAssignmentsForStudent
} from '../services/studentTaskService.js';

function ensureParentSession(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'parent') {
    res.status(403).json({ message: '没有权限' });
    return null;
  }
  return sessionUser;
}

export async function listAssignments(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  try {
    const assignments = await listAssignmentsByParent(sessionUser.id);
    res.json({ assignments });
  } catch (error) {
    res.status(500).json({ message: '获取任务关联失败', detail: error.message });
  }
}

export async function saveAssignments(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const studentId = Number.parseInt(String(req.body.studentId).trim(), 10);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    res.status(400).json({ message: '学生 ID 不合法' });
    return;
  }

  const taskIds = Array.isArray(req.body.taskIds) ? req.body.taskIds : [];

  try {
    const assignments = await setAssignmentsForStudent(sessionUser.id, studentId, taskIds);
    const assignment =
      assignments.find((item) => item.student.id === studentId) ||
      (await listAssignmentsByParent(sessionUser.id)).find((item) => item.student.id === studentId) || {
        student: { id: studentId },
        tasks: [],
        taskIds: []
      };
    res.json({ assignment, assignments });
  } catch (error) {
    if (error.message === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ message: '学生信息不存在' });
    }
    if (error.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ message: '存在无效的任务选择' });
    }
    return res.status(500).json({ message: '保存任务关联失败', detail: error.message });
  }
}

export async function deleteAssignments(req, res) {
  const sessionUser = ensureParentSession(req, res);
  if (!sessionUser) return;

  const studentId = Number.parseInt(String(req.params.studentId).trim(), 10);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    res.status(400).json({ message: '学生 ID 不合法' });
    return;
  }

  try {
    const removed = await clearAssignmentsForStudent(sessionUser.id, studentId);
    if (!removed) {
      return res.status(404).json({ message: '未找到对应的任务关联' });
    }
    const assignments = await listAssignmentsByParent(sessionUser.id);
    return res.json({ assignments });
  } catch (error) {
    return res.status(500).json({ message: '删除任务关联失败', detail: error.message });
  }
}
