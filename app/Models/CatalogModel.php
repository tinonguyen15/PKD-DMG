<?php

namespace App\Models;

use App\Core\Database;

class CatalogModel
{
    public static function users(bool $activeOnly = false): array
    {
        $where = $activeOnly ? 'WHERE active = 1' : '';

        return Database::fetchAll("SELECT * FROM users {$where} ORDER BY role, employee_code, name");
    }

    public static function branches(bool $activeOnly = true): array
    {
        $where = $activeOnly ? 'WHERE active = 1' : '';

        return Database::fetchAll("SELECT * FROM branches {$where} ORDER BY sort_order, name");
    }

    public static function menuCategories(bool $activeOnly = true): array
    {
        $where = $activeOnly ? 'WHERE active = 1' : '';

        return Database::fetchAll("SELECT * FROM menu_categories {$where} ORDER BY sort_order, name");
    }

    public static function menuItems(bool $activeOnly = true): array
    {
        $where = $activeOnly ? 'WHERE mi.active = 1 AND mc.active = 1' : 'WHERE 1 = 1';

        $items = Database::fetchAll(
            "SELECT mi.*, mc.name AS category_name, mc.slug AS category_slug
             FROM menu_items mi
             JOIN menu_categories mc ON mc.id = mi.category_id
             {$where}
             ORDER BY mc.sort_order, mi.sort_order, mi.name"
        );

        $personalUserId = self::personalMenuUserIdForList();
        if ($personalUserId > 0) {
            return PersonalMenuModel::applyToMenuItems($items, $personalUserId);
        }

        return $items;
    }

    public static function menuItem(int|string|null $id = null): ?array
    {
        $id = (int) $id;
        if ($id <= 0) {
            return null;
        }

        $item = Database::fetch(
            "SELECT mi.*, mc.name AS category_name, mc.slug AS category_slug
             FROM menu_items mi
             LEFT JOIN menu_categories mc ON mc.id = mi.category_id
             WHERE mi.id = ?
             LIMIT 1",
            [$id]
        ) ?: null;

        if (!$item) {
            return null;
        }

        $personalUserId = self::personalMenuUserIdForItem();
        if ($personalUserId > 0) {
            return PersonalMenuModel::applyToSingleItem($item, $personalUserId);
        }

        return $item;
    }

    public static function orderSources(bool $activeOnly = true): array
    {
        $where = $activeOnly ? 'WHERE active = 1' : '';

        return Database::fetchAll("SELECT * FROM order_sources {$where} ORDER BY sort_order, name");
    }

    public static function paymentMethods(bool $activeOnly = true): array
    {
        $where = $activeOnly ? 'WHERE active = 1' : '';

        return Database::fetchAll("SELECT * FROM payment_methods {$where} ORDER BY sort_order, name");
    }

    public static function orderStatuses(bool $activeOnly = true): array
    {
        $where = $activeOnly ? 'WHERE active = 1' : '';

        return Database::fetchAll("SELECT * FROM order_statuses {$where} ORDER BY sort_order, name");
    }

    public static function messageCategories(): array
    {
        return Database::fetchAll('SELECT * FROM message_categories ORDER BY sort_order, name');
    }

    public static function messageTemplates(bool $activeOnly = true): array
    {
        $where = $activeOnly ? 'WHERE mt.active = 1' : 'WHERE 1 = 1';

        return Database::fetchAll(
            "SELECT mt.*, mc.name AS category_name
             FROM message_templates mt
             LEFT JOIN message_categories mc ON mc.id = mt.category_id
             {$where}
             ORDER BY mt.is_pinned DESC, COALESCE(mc.sort_order, 999), mt.sort_order, mt.title"
        );
    }

    public static function saveBranch(array $data): void
    {
        $params = [
            trim((string) $data['name']),
            trim((string) ($data['address'] ?? '')),
            trim((string) ($data['phone'] ?? '')),
            !empty($data['active']) ? 1 : 0,
            (int) ($data['sort_order'] ?? 0),
        ];

        if (!empty($data['id'])) {
            Database::execute(
                'UPDATE branches SET name = ?, address = ?, phone = ?, active = ?, sort_order = ? WHERE id = ?',
                [...$params, (int) $data['id']]
            );
            return;
        }

        Database::execute(
            'INSERT INTO branches (name, address, phone, active, sort_order) VALUES (?, ?, ?, ?, ?)',
            $params
        );
    }

    public static function saveSimple(string $table, array $data): void
    {
        $allowed = ['order_sources', 'payment_methods', 'order_statuses', 'menu_categories'];
        if (!in_array($table, $allowed, true)) {
            throw new \InvalidArgumentException('Danh mục không hợp lệ.');
        }

        $name = trim((string) $data['name']);
        $active = !empty($data['active']) ? 1 : 0;
        $sortOrder = (int) ($data['sort_order'] ?? 0);

        if ($table === 'menu_categories') {
            $slug = trim((string) ($data['slug'] ?? self::slug($name)));
            if (!empty($data['id'])) {
                Database::execute(
                    'UPDATE menu_categories SET slug = ?, name = ?, active = ?, sort_order = ? WHERE id = ?',
                    [$slug, $name, $active, $sortOrder, (int) $data['id']]
                );
                return;
            }

            Database::execute(
                'INSERT INTO menu_categories (slug, name, active, sort_order) VALUES (?, ?, ?, ?)',
                [$slug, $name, $active, $sortOrder]
            );
            return;
        }

        if (!empty($data['id'])) {
            Database::execute(
                "UPDATE {$table} SET name = ?, active = ?, sort_order = ? WHERE id = ?",
                [$name, $active, $sortOrder, (int) $data['id']]
            );
            return;
        }

        Database::execute(
            "INSERT INTO {$table} (name, active, sort_order) VALUES (?, ?, ?)",
            [$name, $active, $sortOrder]
        );
    }

    public static function saveMenuItem(array $data): void
    {
        $params = [
            (int) $data['category_id'],
            trim((string) ($data['slug'] ?: self::slug((string) $data['name']))),
            trim((string) $data['name']),
            trim((string) ($data['branch_name'] ?? '')),
            trim((string) ($data['customer_name'] ?? '')),
            max(0, (int) $data['price']),
            trim((string) ($data['unit'] ?? 'phần')) ?: 'phần',
            trim((string) ($data['image_path'] ?? '')),
            max(0, (int) ($data['estimated_guest_count'] ?? 0)),
            !empty($data['active']) ? 1 : 0,
            (int) ($data['sort_order'] ?? 0),
        ];

        if (!empty($data['id'])) {
            Database::execute(
                'UPDATE menu_items SET category_id = ?, slug = ?, name = ?, branch_name = ?, customer_name = ?, price = ?, unit = ?, image_path = ?, estimated_guest_count = ?, active = ?, sort_order = ? WHERE id = ?',
                [...$params, (int) $data['id']]
            );
            return;
        }

        Database::execute(
            'INSERT INTO menu_items (category_id, slug, name, branch_name, customer_name, price, unit, image_path, estimated_guest_count, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            $params
        );
    }

    public static function saveUser(array $data): void
    {
        $params = [
            trim((string) $data['employee_code']),
            trim((string) $data['username']),
            trim((string) $data['name']),
            in_array($data['role'] ?? 'staff', ['admin', 'staff'], true) ? $data['role'] : 'staff',
            !empty($data['active']) ? 1 : 0,
        ];

        if (!empty($data['id'])) {
            if (!empty($data['password'])) {
                Database::execute(
                    'UPDATE users SET employee_code = ?, username = ?, name = ?, role = ?, active = ?, password_hash = ? WHERE id = ?',
                    [...$params, password_hash((string) $data['password'], PASSWORD_DEFAULT), (int) $data['id']]
                );
                return;
            }

            Database::execute(
                'UPDATE users SET employee_code = ?, username = ?, name = ?, role = ?, active = ? WHERE id = ?',
                [...$params, (int) $data['id']]
            );
            return;
        }

        Database::execute(
            'INSERT INTO users (employee_code, username, name, role, active, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
            [...$params, password_hash((string) $data['password'], PASSWORD_DEFAULT)]
        );
    }

    public static function saveMessageTemplate(array $data): void
    {
        $params = [
            self::nullableInt($data['category_id'] ?? null),
            trim((string) $data['title']),
            trim((string) $data['content']),
            trim((string) ($data['keywords'] ?? '')),
            !empty($data['is_pinned']) ? 1 : 0,
            !empty($data['active']) ? 1 : 0,
            (int) ($data['sort_order'] ?? 0),
        ];

        if (!empty($data['id'])) {
            Database::execute(
                'UPDATE message_templates SET category_id = ?, title = ?, content = ?, keywords = ?, is_pinned = ?, active = ?, sort_order = ? WHERE id = ?',
                [...$params, (int) $data['id']]
            );
            return;
        }

        Database::execute(
            'INSERT INTO message_templates (category_id, title, content, keywords, is_pinned, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
            $params
        );
    }

    private static function personalMenuUserIdForList(): int
    {
        $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH) ?: '';
        if ($path !== '/orders/create') {
            return 0;
        }

        $user = function_exists('current_user') ? \current_user() : null;
        return is_array($user) ? (int) ($user['id'] ?? 0) : 0;
    }

    private static function personalMenuUserIdForItem(): int
    {
        $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH) ?: '';
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($path !== '/orders' || $method !== 'POST') {
            return 0;
        }

        $user = function_exists('current_user') ? \current_user() : null;
        return is_array($user) ? (int) ($user['id'] ?? 0) : 0;
    }

    private static function slug(string $text): string
    {
        $text = mb_strtolower(trim($text), 'UTF-8');
        $map = [
            'à' => 'a', 'á' => 'a', 'ạ' => 'a', 'ả' => 'a', 'ã' => 'a', 'â' => 'a', 'ầ' => 'a', 'ấ' => 'a', 'ậ' => 'a', 'ẩ' => 'a', 'ẫ' => 'a', 'ă' => 'a', 'ằ' => 'a', 'ắ' => 'a', 'ặ' => 'a', 'ẳ' => 'a', 'ẵ' => 'a',
            'è' => 'e', 'é' => 'e', 'ẹ' => 'e', 'ẻ' => 'e', 'ẽ' => 'e', 'ê' => 'e', 'ề' => 'e', 'ế' => 'e', 'ệ' => 'e', 'ể' => 'e', 'ễ' => 'e',
            'ì' => 'i', 'í' => 'i', 'ị' => 'i', 'ỉ' => 'i', 'ĩ' => 'i',
            'ò' => 'o', 'ó' => 'o', 'ọ' => 'o', 'ỏ' => 'o', 'õ' => 'o', 'ô' => 'o', 'ồ' => 'o', 'ố' => 'o', 'ộ' => 'o', 'ổ' => 'o', 'ỗ' => 'o', 'ơ' => 'o', 'ờ' => 'o', 'ớ' => 'o', 'ợ' => 'o', 'ở' => 'o', 'ỡ' => 'o',
            'ù' => 'u', 'ú' => 'u', 'ụ' => 'u', 'ủ' => 'u', 'ũ' => 'u', 'ư' => 'u', 'ừ' => 'u', 'ứ' => 'u', 'ự' => 'u', 'ử' => 'u', 'ữ' => 'u',
            'ỳ' => 'y', 'ý' => 'y', 'ỵ' => 'y', 'ỷ' => 'y', 'ỹ' => 'y', 'đ' => 'd',
        ];

        $text = strtr($text, $map);
        $text = preg_replace('/[^a-z0-9]+/', '-', $text) ?: '';

        return trim($text, '-') ?: 'item-' . time();
    }

    private static function nullableInt(mixed $value): ?int
    {
        $value = (int) $value;

        return $value > 0 ? $value : null;
    }
}
