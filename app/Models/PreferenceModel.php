<?php

namespace App\Models;

use App\Core\Database;

class PreferenceModel
{
    public const DEFAULTS = [
        'copy_branch_include_notice' => false,
        'copy_branch_notice_bank_transfer_enabled' => false,
        'copy_branch_notice_default_enabled' => false,
        'copy_branch_notice_cod_enabled' => false,
        'copy_branch_notice_scheduled_enabled' => false,
        'copy_branch_include_tag' => false,
        'copy_branch_tag_text' => '',
        'copy_branch_tag_require_branch_match' => false,
        'copy_branch_tag_by_branch' => [],
        'copy_branch_notice_bank_transfer' => '⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé.',
        'copy_branch_notice_default' => '⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé.',
        'copy_branch_notice_cod' => '⚠ Lưu ý: Đơn ship COD nhé',
        'copy_branch_notice_scheduled' => '⚠ Lưu ý: Đơn hẹn giờ giao nhé',
        'copy_branch_quick_notice_paid_ck' => '⚠ Lưu ý: Khách đã CK nhé',
        'copy_branch_quick_notice_call_before_delivery' => '⚠ Lưu ý: Gọi khách trước khi giao nhé',
        'copy_branch_quick_notice_urgent' => '⚠ Lưu ý: Khách lấy gấp nhé',
        'copy_branch_quick_notice_invoice' => '⚠ Lưu ý: Khách cần hóa đơn nhé',
        'auto_mark_sent_on_branch_copy' => false,
        'customer_confirmation_intro' => '',
        'customer_confirmation_footer' => '',
        'default_order_type' => 'delivery',
        'default_branch_id' => 0,
        'default_source_id' => 0,
        'default_delivery_payment_method_id' => 0,
        'default_pickup_payment_method_id' => 0,
        'remember_last_order_choices' => false,
        'favorite_menu_item_ids' => [],
        'default_contact_branch_id' => 0,
        'default_contact_channel' => 'hotline_1900',
        'default_report_range' => 'today',
    ];

    public const REPORT_RANGES = [
        'today' => 'Hôm nay',
        '7_days' => '7 ngày gần nhất',
        'month' => 'Tháng này',
    ];

    private const BOOL_KEYS = [
        'copy_branch_include_notice',
        'copy_branch_notice_bank_transfer_enabled',
        'copy_branch_notice_default_enabled',
        'copy_branch_notice_cod_enabled',
        'copy_branch_notice_scheduled_enabled',
        'copy_branch_include_tag',
        'copy_branch_tag_require_branch_match',
        'auto_mark_sent_on_branch_copy',
        'remember_last_order_choices',
    ];

    private const INT_KEYS = [
        'default_branch_id',
        'default_source_id',
        'default_delivery_payment_method_id',
        'default_pickup_payment_method_id',
        'default_contact_branch_id',
    ];

    private const TEXT_KEYS = [
        'copy_branch_tag_text',
        'copy_branch_notice_bank_transfer',
        'copy_branch_notice_default',
        'copy_branch_notice_cod',
        'copy_branch_notice_scheduled',
        'copy_branch_quick_notice_paid_ck',
        'copy_branch_quick_notice_call_before_delivery',
        'copy_branch_quick_notice_urgent',
        'copy_branch_quick_notice_invoice',
        'customer_confirmation_intro',
        'customer_confirmation_footer',
    ];

    private const ARRAY_KEYS = [
        'copy_branch_tag_by_branch',
        'favorite_menu_item_ids',
    ];

    public static function systemForm(): array
    {
        return [
            'values' => self::systemValues(),
            'locks' => self::locks(),
        ];
    }

    public static function userForm(int $userId): array
    {
        return [
            'values' => self::resolved($userId),
            'locks' => self::locks(),
            'userValues' => self::userValues($userId),
            'systemValues' => self::systemValues(),
        ];
    }

    public static function resolved(int $userId): array
    {
        $systemValues = self::systemValues();
        $locks = self::locks();
        $userValues = $userId > 0 ? self::userValues($userId) : [];
        $resolved = self::DEFAULTS;

        foreach (array_keys(self::DEFAULTS) as $key) {
            if (($locks[$key] ?? false) === true) {
                $resolved[$key] = $systemValues[$key] ?? self::DEFAULTS[$key];
                continue;
            }

            if ($key === 'copy_branch_tag_by_branch') {
                $resolved[$key] = array_replace(
                    (array) ($systemValues[$key] ?? []),
                    (array) ($userValues[$key] ?? [])
                );
                continue;
            }

            if (array_key_exists($key, $userValues)) {
                $resolved[$key] = $userValues[$key];
                continue;
            }

            $resolved[$key] = $systemValues[$key] ?? self::DEFAULTS[$key];
        }

        return self::sanitizeAll($resolved);
    }

    public static function value(string $key, mixed $default = null, ?int $userId = null): mixed
    {
        if (!array_key_exists($key, self::DEFAULTS)) {
            return $default;
        }

        $currentUser = function_exists('current_user') ? \current_user() : null;
        $resolvedUserId = $userId ?? (is_array($currentUser) ? (int) ($currentUser['id'] ?? 0) : 0);
        $values = $resolvedUserId > 0 ? self::resolved($resolvedUserId) : self::systemValues();

        return array_key_exists($key, $values) ? $values[$key] : ($default ?? self::DEFAULTS[$key]);
    }

    public static function saveSystem(array $input): void
    {
        $values = self::sanitizeAll(self::postedValues($input));
        $lockedKeys = array_map('strval', (array) ($input['locked_keys'] ?? []));

        foreach (array_keys(self::DEFAULTS) as $key) {
            Database::execute(
                "INSERT INTO system_settings (setting_key, value_json, locked)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), locked = VALUES(locked), updated_at = NOW()",
                [$key, self::encode($values[$key]), in_array($key, $lockedKeys, true) ? 1 : 0]
            );
        }
    }

    public static function saveUser(int $userId, array $input): void
    {
        if ($userId <= 0) {
            return;
        }

        $values = self::sanitizeAll(self::postedValues($input));
        $locks = self::locks();

        foreach (array_keys(self::DEFAULTS) as $key) {
            if (($locks[$key] ?? false) === true) {
                continue;
            }

            Database::execute(
                "INSERT INTO user_settings (user_id, setting_key, value_json)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()",
                [$userId, $key, self::encode($values[$key])]
            );
        }
    }

    public static function rememberLastOrderChoices(int $userId, array $data): void
    {
        $preferences = self::resolved($userId);
        if (!$preferences['remember_last_order_choices']) {
            return;
        }

        $updates = [
            'default_order_type' => (string) ($data['order_type'] ?? 'delivery'),
            'default_branch_id' => (int) ($data['branch_id'] ?? 0),
            'default_source_id' => (int) ($data['source_id'] ?? 0),
        ];

        if (($data['order_type'] ?? '') === 'delivery') {
            $updates['default_delivery_payment_method_id'] = (int) ($data['payment_method_id'] ?? 0);
        }
        if (($data['order_type'] ?? '') === 'pickup') {
            $updates['default_pickup_payment_method_id'] = (int) ($data['payment_method_id'] ?? 0);
        }

        $locks = self::locks();
        foreach (self::sanitizeAll([...self::DEFAULTS, ...$updates]) as $key => $value) {
            if (!array_key_exists($key, $updates) || ($locks[$key] ?? false) === true) {
                continue;
            }

            Database::execute(
                "INSERT INTO user_settings (user_id, setting_key, value_json)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()",
                [$userId, $key, self::encode($value)]
            );
        }
    }

    public static function orderDefaultsForScript(int $userId): string
    {
        return json_encode(self::resolved($userId), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?: '{}';
    }

    private static function systemValues(): array
    {
        $values = self::DEFAULTS;
        foreach (self::rows('SELECT setting_key, value_json FROM system_settings') as $row) {
            $key = (string) $row['setting_key'];
            if (array_key_exists($key, self::DEFAULTS)) {
                $values[$key] = self::decode((string) $row['value_json'], self::DEFAULTS[$key]);
            }
        }

        return self::sanitizeAll($values);
    }

    private static function userValues(int $userId): array
    {
        $values = [];
        foreach (self::rows('SELECT setting_key, value_json FROM user_settings WHERE user_id = ?', [$userId]) as $row) {
            $key = (string) $row['setting_key'];
            if (array_key_exists($key, self::DEFAULTS)) {
                $values[$key] = self::decode((string) $row['value_json'], self::DEFAULTS[$key]);
            }
        }

        return array_intersect_key(self::sanitizeAll([...self::DEFAULTS, ...$values]), $values);
    }

    private static function locks(): array
    {
        $locks = array_fill_keys(array_keys(self::DEFAULTS), false);
        foreach (self::rows('SELECT setting_key, locked FROM system_settings') as $row) {
            $key = (string) $row['setting_key'];
            if (array_key_exists($key, $locks)) {
                $locks[$key] = (int) $row['locked'] === 1;
            }
        }

        return $locks;
    }

    private static function rows(string $sql, array $params = []): array
    {
        try {
            return Database::fetchAll($sql, $params);
        } catch (\Throwable) {
            return [];
        }
    }

    private static function postedValues(array $input): array
    {
        $values = self::DEFAULTS;
        foreach (array_keys(self::DEFAULTS) as $key) {
            $values[$key] = self::parsePostedValue($key, $input);
        }

        return $values;
    }

    private static function parsePostedValue(string $key, array $input): mixed
    {
        if (in_array($key, self::BOOL_KEYS, true)) {
            return !empty($input[$key]);
        }

        if (in_array($key, self::INT_KEYS, true)) {
            return max(0, (int) ($input[$key] ?? 0));
        }

        if (in_array($key, self::TEXT_KEYS, true)) {
            return trim((string) ($input[$key] ?? self::DEFAULTS[$key]));
        }

        if (in_array($key, self::ARRAY_KEYS, true)) {
            return (array) ($input[$key] ?? []);
        }

        return trim((string) ($input[$key] ?? self::DEFAULTS[$key]));
    }

    private static function sanitizeAll(array $values): array
    {
        $clean = self::DEFAULTS;

        foreach (self::BOOL_KEYS as $key) {
            $clean[$key] = !empty($values[$key]);
        }
        foreach (self::INT_KEYS as $key) {
            $clean[$key] = max(0, (int) ($values[$key] ?? 0));
        }
        foreach (self::TEXT_KEYS as $key) {
            $clean[$key] = mb_substr(trim((string) ($values[$key] ?? self::DEFAULTS[$key])), 0, 500, 'UTF-8');
        }
        $clean['copy_branch_tag_by_branch'] = self::sanitizeBranchTags((array) ($values['copy_branch_tag_by_branch'] ?? []));
        $clean['favorite_menu_item_ids'] = self::sanitizeIntList((array) ($values['favorite_menu_item_ids'] ?? []));

        $orderType = (string) ($values['default_order_type'] ?? 'delivery');
        $clean['default_order_type'] = array_key_exists($orderType, OrderModel::TYPE_LABELS) ? $orderType : 'delivery';

        $channel = (string) ($values['default_contact_channel'] ?? 'hotline_1900');
        $clean['default_contact_channel'] = array_key_exists($channel, ContactModel::CHANNELS) ? $channel : 'hotline_1900';

        $range = (string) ($values['default_report_range'] ?? 'today');
        $clean['default_report_range'] = array_key_exists($range, self::REPORT_RANGES) ? $range : 'today';

        return $clean;
    }

    private static function sanitizeIntList(array $values): array
    {
        $ids = [];
        foreach ($values as $value) {
            $id = (int) $value;
            if ($id > 0) {
                $ids[$id] = $id;
            }
        }

        return array_values($ids);
    }

    private static function sanitizeBranchTags(array $values): array
    {
        $clean = [];
        foreach ($values as $branchId => $tagText) {
            $branchId = (int) $branchId;
            $tagText = mb_substr(trim((string) $tagText), 0, 120, 'UTF-8');
            if ($branchId > 0) {
                $clean[(string) $branchId] = $tagText;
            }
        }

        return $clean;
    }

    private static function encode(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE) ?: 'null';
    }

    private static function decode(string $json, mixed $default): mixed
    {
        $value = json_decode($json, true);

        return json_last_error() === JSON_ERROR_NONE ? $value : $default;
    }
}
