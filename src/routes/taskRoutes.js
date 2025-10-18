import { Router } from 'express';
import {
  createTaskHandler,
  deleteTaskHandler,
  getTask,
  listTasks,
  updateTaskHandler
} from '../controllers/taskController.js';

const router = Router();

router.get('/', listTasks);
router.post('/', createTaskHandler);
router.get('/:taskId', getTask);
router.put('/:taskId', updateTaskHandler);
router.delete('/:taskId', deleteTaskHandler);

export default router;
