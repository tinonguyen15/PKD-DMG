USE `pkd_dmg`;

INSERT INTO system_settings (setting_key, value_json, locked) VALUES
('copy_branch_notice_bank_transfer_enabled', 'false', 0),
('copy_branch_notice_default_enabled', 'false', 0),
('copy_branch_notice_cod_enabled', 'false', 0),
('copy_branch_notice_scheduled_enabled', 'false', 0),
('copy_branch_tag_require_branch_match', 'false', 0),
('copy_branch_tag_by_branch', '{}', 0)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
