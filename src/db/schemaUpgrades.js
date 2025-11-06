import { pool } from './pool.js';

let ensureSchedulingPromise = null;

async function applyTaskScheduleColumn() {
  try {
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN schedule_type ENUM('weekday','holiday') NOT NULL DEFAULT 'weekday' AFTER points"
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }
}

async function columnExists(table, column) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function dropIndexIfExists(table, indexName) {
  try {
    await pool.query(`ALTER TABLE ${table} DROP INDEX ${indexName}`);
  } catch (error) {
    if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
      throw error;
    }
  }
}

async function applyTaskScheduleOverrideIndexes() {
  try {
    await pool.query(
      'ALTER TABLE task_schedule_overrides ADD UNIQUE KEY uniq_parent_range (parent_id, start_date, end_date)'
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_KEYNAME') {
      throw error;
    }
  }

  try {
    await pool.query(
      'ALTER TABLE task_schedule_overrides ADD KEY idx_overrides_range (start_date, end_date)'
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_KEYNAME') {
      throw error;
    }
  }
}

async function applyTaskScheduleOverrideTable() {
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  if (!(await columnExists('task_schedule_overrides', 'start_date'))) {
    await pool.query(
      'ALTER TABLE task_schedule_overrides ADD COLUMN start_date DATE NULL AFTER parent_id'
    );
  }

  if (!(await columnExists('task_schedule_overrides', 'end_date'))) {
    await pool.query(
      'ALTER TABLE task_schedule_overrides ADD COLUMN end_date DATE NULL AFTER start_date'
    );
  }

  if (await columnExists('task_schedule_overrides', 'override_date')) {
    await pool.query(
      'UPDATE task_schedule_overrides SET start_date = COALESCE(start_date, override_date), end_date = COALESCE(end_date, override_date) WHERE override_date IS NOT NULL'
    );

    await dropIndexIfExists('task_schedule_overrides', 'uniq_parent_date');

    await pool.query('ALTER TABLE task_schedule_overrides MODIFY start_date DATE NOT NULL');
    await pool.query('ALTER TABLE task_schedule_overrides MODIFY end_date DATE NOT NULL');

    try {
      await pool.query('ALTER TABLE task_schedule_overrides DROP COLUMN override_date');
    } catch (error) {
      if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
        throw error;
      }
    }
  } else {
    await pool.query('ALTER TABLE task_schedule_overrides MODIFY start_date DATE NOT NULL');
    await pool.query('ALTER TABLE task_schedule_overrides MODIFY end_date DATE NOT NULL');
  }

  await applyTaskScheduleOverrideIndexes();
}

async function dropLegacyDailyPlanTables() {
  await pool.query('DROP TABLE IF EXISTS student_task_daily_plan_items');
  await pool.query('DROP TABLE IF EXISTS student_task_daily_plans');
}

async function applyDailyPlanTables() {
  await dropLegacyDailyPlanTables();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_plans (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      parent_id BIGINT UNSIGNED NOT NULL,
      student_id BIGINT UNSIGNED NOT NULL,
      plan_date DATE NOT NULL,
      status ENUM('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
      submitted_at DATETIME NULL,
      approved_at DATETIME NULL,
      approved_by BIGINT UNSIGNED NULL,
      rejected_at DATETIME NULL,
      rejected_by BIGINT UNSIGNED NULL,
      rejection_reason VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_daily_plan_student_date (student_id, plan_date),
      KEY idx_daily_plans_parent_date (parent_id, plan_date),
      KEY idx_daily_plans_status (status),
      CONSTRAINT fk_daily_plans_parent FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_daily_plans_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_daily_plans_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
      CONSTRAINT fk_daily_plans_rejected_by FOREIGN KEY (rejected_by) REFERENCES users (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_plan_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      plan_id BIGINT UNSIGNED NOT NULL,
      task_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(255) NOT NULL,
      sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_daily_plan_items_plan (plan_id),
      KEY idx_daily_plan_items_task (task_id),
      KEY idx_daily_plan_items_plan_sort (plan_id, sort_order),
      CONSTRAINT fk_daily_plan_items_plan FOREIGN KEY (plan_id) REFERENCES daily_plans (id) ON DELETE CASCADE,
      CONSTRAINT fk_daily_plan_items_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function applyNotificationsTable() {
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export function ensureTaskSchedulingArtifacts() {
  if (!ensureSchedulingPromise) {
    ensureSchedulingPromise = (async () => {
      await applyTaskScheduleColumn();
      await applyTaskScheduleOverrideTable();
      await applyDailyPlanTables();
      await applyNotificationsTable();
    })().catch((error) => {
      ensureSchedulingPromise = null;
      throw error;
    });
  }
  return ensureSchedulingPromise;
}
