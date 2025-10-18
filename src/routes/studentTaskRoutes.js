import { Router } from 'express';
import {
  deleteAssignments,
  listAssignments,
  saveAssignments
} from '../controllers/studentTaskController.js';

const router = Router();

router.get('/', listAssignments);
router.post('/', saveAssignments);
router.delete('/:studentId', deleteAssignments);

export default router;
