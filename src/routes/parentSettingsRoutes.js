import { Router } from 'express';
import {
  getPlanRewardSetting,
  updatePlanRewardSetting
} from '../controllers/parentSettingsController.js';

const router = Router();

router.get('/', getPlanRewardSetting);
router.put('/', updatePlanRewardSetting);
router.post('/', updatePlanRewardSetting);
router.get('/plan-reward', getPlanRewardSetting);
router.put('/plan-reward', updatePlanRewardSetting);
router.post('/plan-reward', updatePlanRewardSetting);

export default router;
