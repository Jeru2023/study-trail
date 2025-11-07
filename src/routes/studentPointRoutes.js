import { Router } from 'express';
import {
  getStudentLeaderboard,
  getStudentPointFeed
} from '../controllers/studentPointsController.js';

const router = Router();

router.get('/leaderboard', getStudentLeaderboard);
router.get('/feed', getStudentPointFeed);

export default router;
