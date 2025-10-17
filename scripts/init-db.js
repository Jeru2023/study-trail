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

  // eslint-disable-next-line no-console
  console.log('✅ 数据库结构初始化完成');
}

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('❌ 初始化失败', error);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
