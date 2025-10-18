import { Router } from 'express';
import {
  createStudent,
  deleteStudent,
  getCurrentUser,
  getMyStudents,
  login,
  logout,
  registerParent,
  updateStudent
} from '../controllers/authController.js';

const router = Router();

router.post('/register/parent', registerParent);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', getCurrentUser);
router.post('/students', createStudent);
router.get('/students', getMyStudents);
router.put('/students/:studentId', updateStudent);
router.delete('/students/:studentId', deleteStudent);

export default router;
