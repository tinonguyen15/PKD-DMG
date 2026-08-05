<?php

namespace App\Models;

use App\Core\Database;

class PersonalMenuModel
{
    private const KEY_SHOW_FAVORITES = 'personal_menu_show_favorites';
    private const KEY_ITEMS = 'personal_menu_items';

    public const DEFAULTS = [
        self::KEY_SHOW_FAVORITES => true,
        self::KEY_ITEMS => [],
    ];

    public static function settings(int $userId): array
    {
        $settings = self::DEFAULTS;
        if ($userId <= 0) {
            return $settings;
        }

        try {
            $rows = Database::fetchAll(
                'SELECT setting_key, value_json FROM user_settings WHERE user_id = ? AND setting_key IN (?, ?)',
                [$userId, self::KEY_SHOW_FAVORITES, self::KEY_ITEMS]
            );
        } catch (\Throwable) {
            return $settings;
        }

        foreach ($rows as $row) {
            $key = (string) ($row['setting_key'] ?? '');
            if (!array_key_exists($key, $settings)) {
                continue;
            }

            $decoded = json_decode((string) ($row['value_json'] ?? 'null'), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $settings[$key] = $decoded;
            }
        }

        $settings[self::KEY_SHOW_FAVORITES] = !empty($settings[self::KEY_SHOW_FAVORITES]);
        $settings[self::KEY_ITEMS] = self::sanitizeItems((array) ($settings[self::KEY_ITEMS] ?? []));

        return $settings;
    }

    public static function showFavorites(int $userId): bool
    {
        return !empty(self::settings($userId)[self::KEY_SHOW_FAVORITES]);
    }

    public static function itemSettings(int $userId): array
    {
        return self::settings($userId)[self::KEY_ITEMS] ?? [];
    }

    public static function saveUser(int $userId, array $input): void
    {
        if ($userId <= 0) {
            return;
        }

        $showFavorites = !empty($input[self::KEY_SHOW_FAVORITES]);
        $items = self::sanitizeItems((array) ($input[self::KEY_ITEMS] ?? []));

        self::saveSetting($userId, self::KEY_SHOW_FAVORITES, $showFavorites);
        self::saveSetting($userId, self::KEY_ITEMS, $items);
    }

    public static function applyToMenuItems(array $items, int $userId): array
    {
        $customizations = self::itemSettings($userId);
        $result = [];

        foreach ($items as $index => $item) {
            $item['_original_index'] = $index;
            $item = self::applyToItem($item, $customizations);
            if (!$item) {
                continue;
            }
            $result[] = $item;
        }

        usort($result, static function (array $a, array $b): int {
            $aSort = (int) ($a['_personal_sort_order'] ?? 999999);
            $bSort = (int) ($b['_personal_sort_order'] ?? 999999);
            if ($aSort !== $bSort) {
                return $aSort <=> $bSort;
            }

            return ((int) ($a['_original_index'] ?? 0)) <=> ((int) ($b['_original_index'] ?? 0));
        });

        return $result;
    }

    public static function applyToSingleItem(array $item, int $userId): array
    {
        return self::applyToItem($item, self::itemSettings($userId)) ?: $item;
    }

    private static function applyToItem(array $item, array $customizations): ?array
    {
        $id = (int) ($item['id'] ?? 0);
        $custom = $customizations[(string) $id] ?? $customizations[$id] ?? [];
        if (!$custom) {
            $item['_personal_sort_order'] = 999999;
            return $item;
        }

        if (!empty($custom['hidden'])) {
            return null;
        }

        foreach (['name', 'branch_name', 'customer_name', 'image_path'] as $field) {
            $value = trim((string) ($custom[$field] ?? ''));
            if ($value !== '') {
                $item[$field] = $value;
            }
        }

        $sortOrder = (int) ($custom['sort_order'] ?? 0);
        $item['_personal_sort_order'] = $sortOrder > 0 ? $sortOrder : 999999;

        return $item;
    }

    private static function sanitizeItems(array $items): array
    {
        $clean = [];

        foreach ($items as $itemId => $value) {
            $id = (int) $itemId;
            if ($id <= 0 || !is_array($value)) {
                continue;
            }

            $row = [
                'name' => self::shortText($value['name'] ?? '', 180),
                'branch_name' => self::shortText($value['branch_name'] ?? '', 180),
                'customer_name' => self::shortText($value['customer_name'] ?? '', 180),
                'image_path' => self::imagePath($value['image_path'] ?? ''),
                'sort_order' => max(0, (int) ($value['sort_order'] ?? 0)),
                'hidden' => !empty($value['hidden']),
            ];

            if ($row['name'] === '' && $row['branch_name'] === '' && $row['customer_name'] === '' && $row['image_path'] === '' && $row['sort_order'] === 0 && !$row['hidden']) {
                continue;
            }

            $clean[(string) $id] = $row;
        }

        return $clean;
    }

    private static function shortText(mixed $value, int $max): string
    {
        return mb_substr(trim((string) $value), 0, $max, 'UTF-8');
    }

    private static function imagePath(mixed $value): string
    {
        $value = mb_substr(trim((string) $value), 0, 255, 'UTF-8');
        if ($value === '') {
            return '';
        }

        if (preg_match('#^https?://#i', $value) === 1 || str_starts_with($value, '/')) {
            return $value;
        }

        return '';
    }

    private static function saveSetting(int $userId, string $key, mixed $value): void
    {
        Database::execute(
            "INSERT INTO user_settings (user_id, setting_key, value_json)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()",
            [$userId, $key, json_encode($value, JSON_UNESCAPED_UNICODE) ?: 'null']
        );
    }
}
