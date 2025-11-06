import { Router } from 'express';
import {
  fetchDailyPlan,
  saveDailyPlan,
  submitDailyPlan
} from '../controllers/studentPlanController.js';

const router = Router();

router.get('/', fetchDailyPlan);
router.post('/', saveDailyPlan);
router.put('/', saveDailyPlan);
router.post('/submit', submitDailyPlan);

export default router;
