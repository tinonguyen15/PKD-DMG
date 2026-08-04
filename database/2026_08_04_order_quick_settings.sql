USE `pkd_dmg`;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS quick_notice_keys JSON NULL AFTER note;

INSERT INTO system_settings (setting_key, value_json, locked) VALUES
('copy_branch_quick_notice_paid_ck', '"⚠ Lưu ý: Khách đã CK nhé"', 0),
('copy_branch_quick_notice_call_before_delivery', '"⚠ Lưu ý: Gọi khách trước khi giao nhé"', 0),
('copy_branch_quick_notice_urgent', '"⚠ Lưu ý: Khách lấy gấp nhé"', 0),
('copy_branch_quick_notice_invoice', '"⚠ Lưu ý: Khách cần hóa đơn nhé"', 0),
('auto_mark_sent_on_branch_copy', 'false', 0),
('customer_confirmation_intro', '""', 0),
('customer_confirmation_footer', '""', 0),
('show_recent_menu_items_first', 'true', 0),
('favorite_menu_item_ids', '[]', 0)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
