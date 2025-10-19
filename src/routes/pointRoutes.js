import { Router } from 'express';
import {
  getStudentLedger,
  getStudentSummaries,
  postAdjustStudentPoints,
  postRedeemReward
} from '../controllers/pointController.js';

const router = Router();

router.get('/students', getStudentSummaries);
router.get('/students/:studentId/history', getStudentLedger);
router.post('/students/:studentId/adjust', postAdjustStudentPoints);
router.post('/students/:studentId/redeem', postRedeemReward);

export default router;
