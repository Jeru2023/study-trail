CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role ENUM('parent', 'student') NOT NULL,
  login_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NULL,
  parent_id BIGINT UNSIGNED NULL,
  points_balance INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_login_name (login_name),
  UNIQUE KEY uniq_email (email),
  KEY idx_users_parent (parent_id),
  CONSTRAINT fk_users_parent
    FOREIGN KEY (parent_id)
    REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  schedule_type ENUM('weekday', 'holiday', 'recurring') NOT NULL DEFAULT 'weekday',
  recurring_day_of_week TINYINT UNSIGNED NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_parent (parent_id),
  CONSTRAINT fk_tasks_parent
    FOREIGN KEY (parent_id)
    REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  task_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_student_task (student_id, task_id),
  KEY idx_student_tasks_parent (parent_id),
  KEY idx_student_tasks_student (student_id),
  KEY idx_student_tasks_task (task_id),
  CONSTRAINT fk_student_tasks_parent
    FOREIGN KEY (parent_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_student_tasks_student
    FOREIGN KEY (student_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_student_tasks_task
    FOREIGN KEY (task_id)
    REFERENCES tasks (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_task_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  task_id BIGINT UNSIGNED NOT NULL,
  entry_date DATE NOT NULL,
  title VARCHAR(180) NOT NULL,
  notes TEXT NULL,
  status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  duration_seconds INT UNSIGNED NULL,
  review_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  review_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_student_task_entries_student_date (student_id, entry_date),
  KEY idx_student_task_entries_task (task_id),
  CONSTRAINT fk_student_task_entries_parent
    FOREIGN KEY (parent_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_student_task_entries_student
    FOREIGN KEY (student_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_student_task_entries_task
    FOREIGN KEY (task_id)
    REFERENCES tasks (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_task_entry_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entry_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NULL,
  file_type VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_student_task_entry_photos_entry (entry_id),
  CONSTRAINT fk_student_task_entry_photos_entry
    FOREIGN KEY (entry_id)
    REFERENCES student_task_entries (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD COLUMN points_balance INT UNSIGNED NOT NULL DEFAULT 0 AFTER parent_id;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_schedule_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  schedule_type ENUM('weekday', 'holiday') NOT NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_parent_range (parent_id, start_date, end_date),
  KEY idx_overrides_parent (parent_id),
  KEY idx_overrides_range (start_date, end_date),
  CONSTRAINT fk_overrides_parent FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS point_presets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  direction ENUM('bonus', 'penalty') NOT NULL DEFAULT 'bonus',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_point_presets_parent (parent_id),
  CONSTRAINT fk_point_presets_parent FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_points_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  task_entry_id BIGINT UNSIGNED NULL,
  task_id BIGINT UNSIGNED NULL,
  reward_id BIGINT UNSIGNED NULL,
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
  CONSTRAINT fk_points_parent FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_points_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_points_task_entry FOREIGN KEY (task_entry_id) REFERENCES student_task_entries (id) ON DELETE CASCADE,
  CONSTRAINT fk_points_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE student_points_history
  MODIFY COLUMN points INT NOT NULL;

ALTER TABLE student_points_history
  MODIFY COLUMN task_entry_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN task_id BIGINT UNSIGNED NULL;

ALTER TABLE student_points_history
  ADD COLUMN reward_id BIGINT UNSIGNED NULL AFTER task_id;

ALTER TABLE student_points_history
  ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'task' AFTER points;

ALTER TABLE student_points_history
  ADD COLUMN quantity INT UNSIGNED NULL AFTER source;

ALTER TABLE student_points_history
  ADD KEY idx_points_source (source);

ALTER TABLE student_points_history
  ADD KEY idx_points_reward (reward_id);
