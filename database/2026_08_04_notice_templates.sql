USE `pkd_dmg`;

INSERT INTO system_settings (setting_key, value_json, locked) VALUES
('copy_branch_notice_cod', '"⚠ Lưu ý: Đơn ship COD nhé"', 0),
('copy_branch_notice_scheduled', '"⚠ Lưu ý: Đơn hẹn giờ giao nhé"', 0)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

UPDATE system_settings
SET value_json = '"⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé."'
WHERE setting_key = 'copy_branch_notice_bank_transfer'
  AND value_json = '"⚠ Lưu ý CN: Lên đơn gửi QR cho khách CK, CN kiểm tra và phối hợp với PKD."';

UPDATE system_settings
SET value_json = '"⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé."'
WHERE setting_key = 'copy_branch_notice_default'
  AND value_json = '"⚠ Lưu ý CN: PKD đã xác nhận thông tin, CN kiểm tra và phối hợp xử lý giúp PKD."';

UPDATE user_settings
SET value_json = '"⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé."'
WHERE setting_key = 'copy_branch_notice_bank_transfer'
  AND value_json = '"⚠ Lưu ý CN: Lên đơn gửi QR cho khách CK, CN kiểm tra và phối hợp với PKD."';

UPDATE user_settings
SET value_json = '"⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé."'
WHERE setting_key = 'copy_branch_notice_default'
  AND value_json = '"⚠ Lưu ý CN: PKD đã xác nhận thông tin, CN kiểm tra và phối hợp xử lý giúp PKD."';
