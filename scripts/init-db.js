import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const schemaPath = path.resolve(__dirname, '../db/schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf-8');

  const statements = sql
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  for (const statement of statements) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query(statement);
  }

  try {
    await pool.query(
      'ALTER TABLE users ADD COLUMN display_name VARCHAR(100) NULL AFTER email'
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  try {
    await pool.query(
      'ALTER TABLE tasks ADD COLUMN points INT UNSIGNED NOT NULL DEFAULT 0 AFTER description'
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  try {
    await pool.query(
      'ALTER TABLE student_task_entry_photos ADD COLUMN file_type VARCHAR(100) NULL AFTER original_name'
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  // eslint-disable-next-line no-console
  console.log('数据库结构初始化完成');
}

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('数据库初始化失败', error);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
