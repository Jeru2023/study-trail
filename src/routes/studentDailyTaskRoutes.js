import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import {
  addSubtask,
  completeSubtask,
  getDailyTasks,
  startSubtask
} from '../controllers/studentDailyTaskController.js';

const router = Router();

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const studentId = req.session?.user?.id;
    if (!studentId) {
      cb(new Error('STUDENT_SESSION_REQUIRED'));
      return;
    }

    const targetDir = path.join(config.uploads.baseDir, String(studentId));
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (error) {
      cb(error);
      return;
    }
    cb(null, targetDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').slice(0, 10);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    files: config.uploads.maxPhotosPerEntry,
    fileSize: config.uploads.maxFileSizeMb * 1024 * 1024
  },
  fileFilter(_req, file, cb) {
    if (
      !file.mimetype ||
      (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/'))
    ) {
      cb(Object.assign(new Error('INVALID_FILE_TYPE'), { code: 'INVALID_FILE_TYPE' }));
      return;
    }
    cb(null, true);
  }
});

function handleUploadErrors(middleware) {
  return (req, res, next) => {
    middleware(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          message: `上传文件过大，单个文件不超过 ${config.uploads.maxFileSizeMb}MB`
        });
        return;
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({
          message: `上传文件数量超过限制，每次最多 ${config.uploads.maxPhotosPerEntry} 个文件`
        });
        return;
      }
      if (error.code === 'INVALID_FILE_TYPE') {
        res.status(400).json({ message: '仅支持上传图片或视频格式' });
        return;
      }

      res.status(400).json({ message: '上传失败', detail: error.message });
    });
  };
}

router.get('/daily-tasks', getDailyTasks);
router.post('/daily-tasks/:taskId/subtasks', addSubtask);
router.patch('/subtasks/:entryId/start', startSubtask);
router.post(
  '/subtasks/:entryId/complete',
  handleUploadErrors(upload.array('proofs', config.uploads.maxPhotosPerEntry)),
  completeSubtask
);

export default router;
