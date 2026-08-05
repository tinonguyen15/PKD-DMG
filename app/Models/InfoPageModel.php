<?php

namespace App\Models;

use App\Core\Database;

class InfoPageModel
{
    public const KEY_CUSTOM_TABS = 'custom_info_tabs';
    public const MAX_CUSTOM_TABS = 5;

    public static function systemTabs(): array
    {
        return [
            ['key' => 'branches', 'title' => 'Địa chỉ CN', 'href' => '/info/branches', 'icon' => '⌖'],
            ['key' => 'bank-accounts', 'title' => 'STK CN', 'href' => '/info/bank-accounts', 'icon' => '₫'],
            ['key' => 'menu', 'title' => 'Menu', 'href' => '/info/menu', 'icon' => '☰'],
        ];
    }

    public static function customTabs(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }

        try {
            $row = Database::fetch(
                'SELECT value_json FROM user_settings WHERE user_id = ? AND setting_key = ? LIMIT 1',
                [$userId, self::KEY_CUSTOM_TABS]
            );
        } catch (\Throwable) {
            return [];
        }

        if (!$row) {
            return [];
        }

        $decoded = json_decode((string) ($row['value_json'] ?? '[]'), true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
            return [];
        }

        return self::sanitizeCustomTabs($decoded);
    }

    public static function sidebarCustomTabs(int $userId): array
    {
        return array_values(array_filter(
            self::customTabs($userId),
            static fn(array $tab): bool => !empty($tab['active']) && trim((string) ($tab['title'] ?? '')) !== ''
        ));
    }

    public static function saveCustomTabs(int $userId, array $input): void
    {
        if ($userId <= 0) {
            return;
        }

        $tabs = self::sanitizeCustomTabs((array) ($input[self::KEY_CUSTOM_TABS] ?? []));

        Database::execute(
            "INSERT INTO user_settings (user_id, setting_key, value_json)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()",
            [$userId, self::KEY_CUSTOM_TABS, json_encode($tabs, JSON_UNESCAPED_UNICODE) ?: '[]']
        );
    }

    public static function customTab(int $userId, int $index): ?array
    {
        $tabs = self::sidebarCustomTabs($userId);
        return $tabs[$index] ?? null;
    }

    public static function branchBankAccounts(): array
    {
        try {
            $row = Database::fetch('SELECT value_json FROM system_settings WHERE setting_key = ? LIMIT 1', ['branch_bank_accounts']);
        } catch (\Throwable) {
            return [];
        }

        if (!$row) {
            return [];
        }

        $decoded = json_decode((string) ($row['value_json'] ?? '[]'), true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
            return [];
        }

        $clean = [];
        foreach ($decoded as $branchId => $value) {
            if (!is_array($value)) {
                continue;
            }

            $id = (int) $branchId;
            if ($id <= 0) {
                $id = (int) ($value['branch_id'] ?? 0);
            }
            if ($id <= 0) {
                continue;
            }

            $clean[$id] = [
                'bank_name' => self::shortText($value['bank_name'] ?? '', 120),
                'account_number' => self::shortText($value['account_number'] ?? '', 80),
                'account_name' => self::shortText($value['account_name'] ?? '', 160),
                'note' => self::shortText($value['note'] ?? '', 255),
            ];
        }

        return $clean;
    }

    private static function sanitizeCustomTabs(array $tabs): array
    {
        $clean = [];
        foreach ($tabs as $index => $tab) {
            if (count($clean) >= self::MAX_CUSTOM_TABS) {
                break;
            }
            if (!is_array($tab)) {
                continue;
            }

            $title = self::shortText($tab['title'] ?? '', 40);
            $content = self::longText($tab['content'] ?? '', 5000);
            $active = !empty($tab['active']);

            if ($title === '' && $content === '') {
                $clean[] = ['title' => '', 'content' => '', 'active' => false];
                continue;
            }

            $clean[] = [
                'title' => $title,
                'content' => $content,
                'active' => $active && $title !== '',
            ];
        }

        while (count($clean) < self::MAX_CUSTOM_TABS) {
            $clean[] = ['title' => '', 'content' => '', 'active' => false];
        }

        return array_slice($clean, 0, self::MAX_CUSTOM_TABS);
    }

    private static function shortText(mixed $value, int $max): string
    {
        return mb_substr(trim((string) $value), 0, $max, 'UTF-8');
    }

    private static function longText(mixed $value, int $max): string
    {
        return mb_substr(trim((string) $value), 0, $max, 'UTF-8');
    }
}
