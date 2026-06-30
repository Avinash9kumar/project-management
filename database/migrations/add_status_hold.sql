-- Add "hold" status to timeline_items (run once on existing databases)
ALTER TABLE timeline_items
  MODIFY COLUMN status ENUM('pending', 'in_progress', 'hold', 'completed') DEFAULT 'pending';
