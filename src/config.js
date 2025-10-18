import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
} else {
  dotenv.config();
}

export const config = {
  appName: '学迹',
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'study-trail-dev-secret',
  db: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'study_trail',
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE) || 10
  },
  uploads: {
    baseDir: path.resolve(process.cwd(), process.env.UPLOADS_DIR || 'uploads'),
    baseUrl: '/uploads',
    maxPhotosPerEntry: Number(process.env.UPLOADS_MAX_PHOTOS_PER_ENTRY) || 6,
    maxFileSizeMb: Number(process.env.UPLOADS_MAX_FILE_SIZE_MB) || 10
  }
};
