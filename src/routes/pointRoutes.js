import { Router } from 'express';
import {
  deletePointPresetController,
  getPointPresets,
  getStudentLedger,
  getStudentSummaries,
  postPointPreset,
  postAdjustStudentPoints,
  postRedeemReward,
  putPointPreset
} from '../controllers/pointController.js';

const router = Router();

router.get('/presets', getPointPresets);
router.post('/presets', postPointPreset);
router.put('/presets/:presetId', putPointPreset);
router.delete('/presets/:presetId', deletePointPresetController);

router.get('/students', getStudentSummaries);
router.get('/students/:studentId/history', getStudentLedger);
router.post('/students/:studentId/adjust', postAdjustStudentPoints);
router.post('/students/:studentId/redeem', postRedeemReward);

export default router;
