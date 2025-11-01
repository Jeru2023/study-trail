import { Router } from 'express';
import {
  createTaskHandler,
  deleteTaskHandler,
  deleteScheduleOverrideHandler,
  getTask,
  listScheduleOverridesHandler,
  listTasks,
  updateTaskHandler,
  upsertScheduleOverrideHandler
} from '../controllers/taskController.js';

const router = Router();

router.get('/', listTasks);
router.post('/', createTaskHandler);
router.get('/schedule-overrides', listScheduleOverridesHandler);
router.post('/schedule-overrides', upsertScheduleOverrideHandler);
router.delete('/schedule-overrides/:overrideId', deleteScheduleOverrideHandler);
router.get('/:taskId', getTask);
router.put('/:taskId', updateTaskHandler);
router.delete('/:taskId', deleteTaskHandler);

export default router;
