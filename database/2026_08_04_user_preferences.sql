USE `pkd_dmg`;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(120) NOT NULL PRIMARY KEY,
  value_json JSON NOT NULL,
  locked TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  setting_key VARCHAR(120) NOT NULL,
  value_json JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_settings_key (user_id, setting_key),
  INDEX idx_user_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_settings (setting_key, value_json, locked) VALUES
('copy_branch_include_notice', 'false', 0),
('copy_branch_notice_bank_transfer_enabled', 'false', 0),
('copy_branch_notice_default_enabled', 'false', 0),
('copy_branch_notice_cod_enabled', 'false', 0),
('copy_branch_notice_scheduled_enabled', 'false', 0),
('copy_branch_include_tag', 'false', 0),
('copy_branch_tag_text', '""', 0),
('copy_branch_tag_require_branch_match', 'false', 0),
('copy_branch_tag_by_branch', '{}', 0),
('copy_branch_notice_bank_transfer', '"⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé."', 0),
('copy_branch_notice_default', '"⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé."', 0),
('copy_branch_notice_cod', '"⚠ Lưu ý: Đơn ship COD nhé"', 0),
('copy_branch_notice_scheduled', '"⚠ Lưu ý: Đơn hẹn giờ giao nhé"', 0),
('copy_branch_quick_notice_paid_ck', '"⚠ Lưu ý: Khách đã CK nhé"', 0),
('copy_branch_quick_notice_call_before_delivery', '"⚠ Lưu ý: Gọi khách trước khi giao nhé"', 0),
('copy_branch_quick_notice_urgent', '"⚠ Lưu ý: Khách lấy gấp nhé"', 0),
('copy_branch_quick_notice_invoice', '"⚠ Lưu ý: Khách cần hóa đơn nhé"', 0),
('auto_mark_sent_on_branch_copy', 'false', 0),
('customer_confirmation_intro', '""', 0),
('customer_confirmation_footer', '""', 0),
('default_order_type', '"delivery"', 0),
('default_branch_id', '0', 0),
('default_source_id', '0', 0),
('default_delivery_payment_method_id', '0', 0),
('default_pickup_payment_method_id', '0', 0),
('remember_last_order_choices', 'false', 0),
('show_recent_menu_items_first', 'true', 0),
('favorite_menu_item_ids', '[]', 0),
('default_contact_branch_id', '0', 0),
('default_contact_channel', '"hotline_1900"', 0),
('default_report_range', '"today"', 0)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
