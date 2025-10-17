import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import authRoutes from './routes/authRoutes.js';
import { healthCheck } from './db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

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

app.use(express.static(publicDir));

app.get('/api/health', async (_req, res) => {
  try {
    await healthCheck();
    res.json({ status: 'ok', service: config.appName });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: error.message });
  }
});

app.use('/api/auth', authRoutes);

app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(publicDir, '404.html'));
  }
  return res.status(404).json({ message: '未找到资源' });
});
