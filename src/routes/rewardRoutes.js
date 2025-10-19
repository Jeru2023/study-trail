import { Router } from 'express';
import {
  createReward,
  deleteReward,
  listRewards,
  updateReward
} from '../controllers/rewardController.js';

const router = Router();

router.get('/', listRewards);
router.post('/', createReward);
router.put('/:rewardId', updateReward);
router.delete('/:rewardId', deleteReward);

export default router;
