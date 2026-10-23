-- Add PPT timeline tab custom fields (run once on existing databases)
INSERT IGNORE INTO custom_field_definitions (timeline_type, field_key, field_label, field_type, options_json, sort_order) VALUES
  ('ppt', 'presenter', 'Presenter', 'text', NULL, 1),
  ('ppt', 'deck_status', 'Deck Status', 'select', '["Draft","Review","Final"]', 2);
