import { Router } from 'express';
import {
  approveEntry,
  listDailyApprovals,
  rejectEntry,
  deleteEntry
} from '../controllers/parentApprovalController.js';

const router = Router();

router.get('/', listDailyApprovals);
router.post('/entries/:entryId/approve', approveEntry);
router.post('/entries/:entryId/reject', rejectEntry);
router.delete('/entries/:entryId', deleteEntry);

export default router;
