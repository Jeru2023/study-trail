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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
