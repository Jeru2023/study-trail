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
      if (
        ['ER_DUP_FIELDNAME', 'ER_DUP_KEY', 'ER_DUP_KEYNAME', 'ER_TABLE_EXISTS_ERROR'].includes(
          error.code
        )
      ) {
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

  try {
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN schedule_type ENUM('weekday','holiday','recurring') NOT NULL DEFAULT 'weekday' AFTER points"
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  try {
    await pool.query(
      "ALTER TABLE tasks MODIFY COLUMN schedule_type ENUM('weekday','holiday','recurring') NOT NULL DEFAULT 'weekday'"
    );
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') {
      throw error;
    }
  }

  try {
    await pool.query(
      'ALTER TABLE tasks ADD COLUMN recurring_day_of_week TINYINT UNSIGNED NULL AFTER schedule_type'
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
      CREATE TABLE IF NOT EXISTS student_task_daily_plans (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        parent_id BIGINT UNSIGNED NOT NULL,
        student_id BIGINT UNSIGNED NOT NULL,
        task_id BIGINT UNSIGNED NOT NULL,
        entry_date DATE NOT NULL,
        required_subtasks INT UNSIGNED NOT NULL,
        is_locked TINYINT(1) NOT NULL DEFAULT 0,
        locked_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_daily_plan (parent_id, student_id, task_id, entry_date),
        KEY idx_daily_plans_parent (parent_id),
        KEY idx_daily_plans_student (student_id),
        KEY idx_daily_plans_task (task_id),
        CONSTRAINT fk_daily_plans_parent FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_daily_plans_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_daily_plans_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } catch (error) {
    throw error;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_schedule_overrides (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        parent_id BIGINT UNSIGNED NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        schedule_type ENUM('weekday','holiday') NOT NULL,
        note VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_parent_range (parent_id, start_date, end_date),
        KEY idx_overrides_parent (parent_id),
        KEY idx_overrides_range (start_date, end_date),
        CONSTRAINT fk_overrides_parent FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } catch (error) {
    throw error;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(150) NOT NULL,
        body TEXT NULL,
        link_url VARCHAR(255) NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_notifications_user_read (user_id, is_read, created_at),
        KEY idx_notifications_user_created (user_id, created_at),
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } catch (error) {
    throw error;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_points_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        parent_id BIGINT UNSIGNED NOT NULL,
        student_id BIGINT UNSIGNED NOT NULL,
        task_entry_id BIGINT UNSIGNED NULL,
        task_id BIGINT UNSIGNED NULL,
        reward_id BIGINT UNSIGNED NULL,
        plan_id BIGINT UNSIGNED NULL,
        points INT NOT NULL,
        source VARCHAR(50) NOT NULL DEFAULT 'task',
        quantity INT UNSIGNED NULL,
        note VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_points_entry (task_entry_id),
        KEY idx_points_student (student_id),
        KEY idx_points_parent (parent_id),
        KEY idx_points_source (source),
        KEY idx_points_reward (reward_id),
        KEY idx_points_plan (plan_id),
        CONSTRAINT fk_points_parent FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_points_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_points_task_entry FOREIGN KEY (task_entry_id) REFERENCES student_task_entries (id) ON DELETE CASCADE,
        CONSTRAINT fk_points_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } catch (error) {
    throw error;
  }

  try {
    await pool.query(
      'ALTER TABLE daily_plans ADD COLUMN approval_points INT UNSIGNED NOT NULL DEFAULT 0 AFTER required_subtasks'
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME' && error.code !== 'ER_NO_SUCH_TABLE') {
      throw error;
    }
  }

  try {
    await pool.query(
      'ALTER TABLE student_points_history ADD COLUMN plan_id BIGINT UNSIGNED NULL AFTER reward_id'
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  try {
    await pool.query('ALTER TABLE student_points_history ADD KEY idx_points_plan (plan_id)');
  } catch (error) {
    if (error.code !== 'ER_DUP_KEYNAME') {
      throw error;
    }
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
