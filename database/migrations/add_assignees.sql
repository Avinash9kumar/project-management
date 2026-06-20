-- Run once on existing databases (Hostinger phpMyAdmin)
CREATE TABLE IF NOT EXISTS assignees (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  sort_order INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_assignee_value (value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO assignees (value, sort_order) VALUES
  ('avinash@ae-research.com', 0),
  ('anupam@ae-research.com', 1),
  ('aashish@ae-research.com', 2),
  ('mansiha@ae-research.com', 3),
  ('paritosh@ae-research.com', 4),
  ('shahid@ae-research.com', 5),
  ('projects@ae-research.com', 6);
