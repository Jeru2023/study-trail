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
    try {
      // eslint-disable-next-line no-await-in-loop
      await pool.query(statement);
    } catch (error) {
      if (['ER_DUP_FIELDNAME', 'ER_DUP_KEY', 'ER_TABLE_EXISTS_ERROR'].includes(error.code)) {
        // eslint-disable-next-line no-continue
        continue;
      }
      throw error;
    }
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

  const reviewColumnSql = [
    "ALTER TABLE student_task_entries ADD COLUMN review_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER duration_seconds",
    'ALTER TABLE student_task_entries ADD COLUMN reviewed_by BIGINT UNSIGNED NULL AFTER review_status',
    'ALTER TABLE student_task_entries ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by',
    'ALTER TABLE student_task_entries ADD COLUMN review_notes TEXT NULL AFTER reviewed_at'
  ];

  for (const statement of reviewColumnSql) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await pool.query(statement);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
  }

  try {
    await pool.query(
      'ALTER TABLE users ADD COLUMN points_balance INT UNSIGNED NOT NULL DEFAULT 0 AFTER parent_id'
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_points_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        parent_id BIGINT UNSIGNED NOT NULL,
        student_id BIGINT UNSIGNED NOT NULL,
        task_entry_id BIGINT UNSIGNED NOT NULL,
        task_id BIGINT UNSIGNED NOT NULL,
        points INT UNSIGNED NOT NULL,
        note VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_points_entry (task_entry_id),
        KEY idx_points_student (student_id),
        KEY idx_points_parent (parent_id),
        CONSTRAINT fk_points_parent FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_points_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_points_task_entry FOREIGN KEY (task_entry_id) REFERENCES student_task_entries (id) ON DELETE CASCADE,
        CONSTRAINT fk_points_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } catch (error) {
    throw error;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reward_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        parent_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(150) NOT NULL,
        description TEXT NULL,
        points_cost INT UNSIGNED NOT NULL,
        stock INT UNSIGNED NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_reward_items_parent (parent_id),
        KEY idx_reward_items_active (is_active),
        CONSTRAINT fk_reward_items_parent FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } catch (error) {
    throw error;
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
