import { Router } from 'express';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../controllers/notificationController.js';

const router = Router();

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read-all', markAllNotificationsAsRead);
router.post('/:notificationId/read', markNotificationAsRead);

export default router;
