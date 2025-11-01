import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import studentTaskRoutes from './routes/studentTaskRoutes.js';
import studentDailyTaskRoutes from './routes/studentDailyTaskRoutes.js';
import parentApprovalRoutes from './routes/parentApprovalRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import pointRoutes from './routes/pointRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { healthCheck } from './db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const uploadsDir = config.uploads.baseDir;

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.get('/api/health', async (_req, res) => {
  try {
    await healthCheck();
    res.json({ status: 'ok', service: config.appName });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/student-tasks', (req, _res, next) => {
  // eslint-disable-next-line no-console
  console.debug(`[student-tasks] ${req.method} ${req.originalUrl}`);
  next();
});
app.use('/api/student-tasks', studentTaskRoutes);
app.use('/api/student', studentDailyTaskRoutes);
app.use('/api/approvals', parentApprovalRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(express.static(publicDir));
app.use(config.uploads.baseUrl, express.static(uploadsDir));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Resource not found' });
  }
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(publicDir, '404.html'));
  }
  return res.status(404).json({ message: 'Resource not found' });
});
