USE `pkd_dmg`;

UPDATE system_settings
SET value_json = 'false'
WHERE setting_key IN (
  'copy_branch_notice_bank_transfer_enabled',
  'copy_branch_notice_default_enabled',
  'copy_branch_notice_cod_enabled',
  'copy_branch_notice_scheduled_enabled'
)
AND (SELECT value_json FROM (SELECT value_json FROM system_settings WHERE setting_key = 'copy_branch_include_notice') AS notice_master) = 'false';

UPDATE system_settings
SET value_json = '""'
WHERE setting_key = 'copy_branch_tag_text'
  AND value_json = '"@"'
  AND (SELECT value_json FROM (SELECT value_json FROM system_settings WHERE setting_key = 'copy_branch_include_tag') AS tag_master) = 'false';

UPDATE user_settings us
JOIN user_settings master
  ON master.user_id = us.user_id
 AND master.setting_key = 'copy_branch_include_notice'
 AND master.value_json = 'false'
SET us.value_json = 'false'
WHERE us.setting_key IN (
  'copy_branch_notice_bank_transfer_enabled',
  'copy_branch_notice_default_enabled',
  'copy_branch_notice_cod_enabled',
  'copy_branch_notice_scheduled_enabled'
);

UPDATE user_settings us
JOIN user_settings master
  ON master.user_id = us.user_id
 AND master.setting_key = 'copy_branch_include_tag'
 AND master.value_json = 'false'
SET us.value_json = '""'
WHERE us.setting_key = 'copy_branch_tag_text'
  AND us.value_json = '"@"';
