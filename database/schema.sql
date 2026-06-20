-- Project Timeline Tracker - FRESH DATABASE SETUP
-- ============================================================
-- LOCAL: Run this whole file in MySQL / phpMyAdmin
-- HOSTINGER (dash-bot.net): Database already created as u511101901_project_manage
--            Open phpMyAdmin → select u511101901_project_manage
--            Run only from "-- Projects" below (skip CREATE DATABASE and USE)
-- ============================================================


-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  end_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Timeline items
CREATE TABLE IF NOT EXISTS timeline_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  timeline_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  start_date DATE NULL,
  due_date DATE NULL,
  sort_order INT UNSIGNED DEFAULT 0,
  custom_fields JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_timeline (project_id, timeline_type),
  INDEX idx_sort (project_id, timeline_type, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Custom field definitions per timeline type
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  timeline_type VARCHAR(50) NOT NULL,
  field_key VARCHAR(50) NOT NULL,
  field_label VARCHAR(100) NOT NULL,
  field_type ENUM('text', 'number', 'date', 'select') DEFAULT 'text',
  options_json JSON NULL,
  sort_order INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_type_key (timeline_type, field_key),
  INDEX idx_timeline_type (timeline_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default custom fields
INSERT INTO custom_field_definitions (timeline_type, field_key, field_label, field_type, options_json, sort_order) VALUES
  ('programming', 'developer', 'Developer', 'text', NULL, 1),
  ('programming', 'priority', 'Priority', 'select', '["Low","Medium","High"]', 2),
  ('launch', 'launch_phase', 'Launch Phase', 'select', '["Alpha","Beta","Production"]', 1),
  ('launch', 'stakeholder', 'Stakeholder', 'text', NULL, 2),
  ('qc', 'tester', 'Tester', 'text', NULL, 1),
  ('qc', 'test_result', 'Test Result', 'select', '["Pass","Fail","Pending"]', 2),
  ('tabs_syntax', 'syntax_version', 'Syntax Version', 'text', NULL, 1),
  ('oe_coding', 'oe_module', 'OE Module', 'text', NULL, 1),
  ('tabs', 'tab_count', 'Tab Count', 'number', NULL, 1),
  ('invite', 'invite_type', 'Invite Type', 'select', '["Client","Team","Vendor","Other"]', 1),
  ('reminders', 'reminder_type', 'Reminder Type', 'select', '["Follow-up","Meeting","Deadline","Other"]', 1),
  ('project_end_date', 'milestone_type', 'Milestone Type', 'select', '["Planning","Review","Final Delivery"]', 1);
