import { Router } from 'express';
import {
  createStudent,
  getMyStudents,
  login,
  logout,
  registerParent
} from '../controllers/authController.js';

const router = Router();

router.post('/register/parent', registerParent);
router.post('/login', login);
router.post('/logout', logout);
router.post('/students', createStudent);
router.get('/students', getMyStudents);

export default router;
