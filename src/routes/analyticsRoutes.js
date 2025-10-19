import { Router } from 'express';
import { getDashboard, getStudentHistory } from '../controllers/analyticsController.js';

const router = Router();

router.get('/dashboard', getDashboard);
router.get('/students/:studentId/history', getStudentHistory);

export default router;
