import { Router } from 'express';
import {
  approvePlan,
  getDailyPlanDetail,
  listDailyPlans,
  rejectPlan
} from '../controllers/parentPlanController.js';

const router = Router();

router.get('/', listDailyPlans);
router.get('/:planId', getDailyPlanDetail);
router.post('/:planId/approve', approvePlan);
router.post('/:planId/reject', rejectPlan);

export default router;
