<?php

namespace App\Models;

use App\Core\Database;

class CustomerModel
{
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';
        if (str_starts_with($digits, '84') && strlen($digits) >= 10) {
            $digits = '0' . substr($digits, 2);
        }

        return $digits;
    }

    public static function lookup(string $phone): array
    {
        $normalized = self::normalizePhone($phone);
        if ($normalized === '' || strlen($normalized) < 8) {
            return [
                'found' => false,
                'phone' => $phone,
                'phone_normalized' => $normalized,
                'customer' => null,
                'summary' => self::emptySummary(),
                'recent_orders' => [],
            ];
        }

        $variants = self::phoneVariants($normalized);
        $customer = self::customerByPhone($variants);
        $summary = self::summaryByPhone($variants);
        $recentOrders = self::recentOrdersByPhone($variants);

        if (!$customer && (int) ($summary['total_orders'] ?? 0) > 0) {
            $customer = [
                'phone_display' => $phone,
                'phone_normalized' => $normalized,
                'name' => (string) ($summary['last_customer_name'] ?? ''),
                'address' => (string) ($summary['last_address'] ?? ''),
                'is_blacklisted' => 0,
                'blacklist_reason' => '',
                'notes' => '',
                'created_at' => null,
                'updated_at' => null,
            ];
        }

        return [
            'found' => (bool) ($customer || (int) ($summary['total_orders'] ?? 0) > 0),
            'phone' => $phone,
            'phone_normalized' => $normalized,
            'customer' => self::presentCustomer($customer),
            'summary' => self::presentSummary($summary),
            'recent_orders' => array_map([self::class, 'presentOrder'], $recentOrders),
        ];
    }

    public static function touchFromOrder(array $data, int $orderId): void
    {
        $phone = trim((string) ($data['phone'] ?? ''));
        $normalized = self::normalizePhone($phone);
        if ($normalized === '' || strlen($normalized) < 8) {
            return;
        }

        try {
            $existing = self::customerByPhone([$normalized]);
            $now = date('Y-m-d H:i:s');
            $params = [
                $normalized,
                $phone,
                trim((string) ($data['customer_name'] ?? '')),
                trim((string) ($data['address'] ?? '')),
                self::nullableInt($data['branch_id'] ?? null),
                self::nullableInt($data['source_id'] ?? null),
                $orderId,
                $now,
                $now,
            ];

            if ($existing) {
                Database::execute(
                    "UPDATE customers
                     SET phone_display = ?,
                         name = CASE WHEN ? <> '' THEN ? ELSE name END,
                         address = CASE WHEN ? <> '' THEN ? ELSE address END,
                         last_branch_id = ?,
                         last_source_id = ?,
                         last_order_id = ?,
                         last_order_at = ?,
                         updated_at = ?
                     WHERE id = ?",
                    [
                        $phone,
                        trim((string) ($data['customer_name'] ?? '')),
                        trim((string) ($data['customer_name'] ?? '')),
                        trim((string) ($data['address'] ?? '')),
                        trim((string) ($data['address'] ?? '')),
                        self::nullableInt($data['branch_id'] ?? null),
                        self::nullableInt($data['source_id'] ?? null),
                        $orderId,
                        $now,
                        $now,
                        (int) $existing['id'],
                    ]
                );
                return;
            }

            Database::execute(
                "INSERT INTO customers
                 (phone_normalized, phone_display, name, address, last_branch_id, last_source_id, last_order_id, first_order_at, last_order_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                $params
            );
        } catch (\Throwable) {
            // Không để tính năng CRM phụ làm hỏng luồng lên đơn nếu production chưa chạy migration.
        }
    }

    public static function setBlacklist(string $phone, bool $blacklisted, string $reason = ''): array
    {
        $normalized = self::normalizePhone($phone);
        if ($normalized === '' || strlen($normalized) < 8) {
            throw new \InvalidArgumentException('Số điện thoại không hợp lệ.');
        }

        $current = self::lookup($phone);
        $name = (string) ($current['customer']['name'] ?? $current['summary']['last_customer_name'] ?? '');
        $address = (string) ($current['customer']['address'] ?? $current['summary']['last_address'] ?? '');
        $reason = mb_substr(trim($reason), 0, 255, 'UTF-8');

        Database::execute(
            "INSERT INTO customers (phone_normalized, phone_display, name, address, is_blacklisted, blacklist_reason, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
                phone_display = VALUES(phone_display),
                name = CASE WHEN VALUES(name) <> '' THEN VALUES(name) ELSE name END,
                address = CASE WHEN VALUES(address) <> '' THEN VALUES(address) ELSE address END,
                is_blacklisted = VALUES(is_blacklisted),
                blacklist_reason = VALUES(blacklist_reason),
                updated_at = NOW()",
            [$normalized, $phone, $name, $address, $blacklisted ? 1 : 0, $blacklisted ? $reason : '']
        );

        return self::lookup($phone);
    }

    private static function customerByPhone(array $variants): ?array
    {
        try {
            [$where, $params] = self::phoneWhere('phone_normalized', $variants);
            return Database::fetch(
                "SELECT * FROM customers WHERE {$where} ORDER BY updated_at DESC LIMIT 1",
                $params
            );
        } catch (\Throwable) {
            return null;
        }
    }

    private static function summaryByPhone(array $variants): array
    {
        [$where, $params] = self::orderPhoneWhere($variants);
        $row = Database::fetch(
            "SELECT
                COUNT(*) AS total_orders,
                COALESCE(SUM(o.workflow_status = 'completed'), 0) AS completed_orders,
                COALESCE(SUM(o.workflow_status = 'cancelled'), 0) AS cancelled_orders,
                COALESCE(SUM(o.workflow_status IN ('processing', 'sent')), 0) AS active_orders,
                COALESCE(SUM(CASE WHEN o.workflow_status = 'completed' THEN o.total ELSE 0 END), 0) AS completed_revenue,
                COALESCE(SUM(o.total), 0) AS gross_revenue,
                MIN(o.created_at) AS first_order_at,
                MAX(o.created_at) AS last_order_at,
                SUBSTRING_INDEX(GROUP_CONCAT(o.customer_name ORDER BY o.created_at DESC SEPARATOR '|||'), '|||', 1) AS last_customer_name,
                SUBSTRING_INDEX(GROUP_CONCAT(o.address ORDER BY o.created_at DESC SEPARATOR '|||'), '|||', 1) AS last_address,
                SUBSTRING_INDEX(GROUP_CONCAT(COALESCE(b.name, '') ORDER BY o.created_at DESC SEPARATOR '|||'), '|||', 1) AS last_branch_name,
                SUBSTRING_INDEX(GROUP_CONCAT(COALESCE(s.name, '') ORDER BY o.created_at DESC SEPARATOR '|||'), '|||', 1) AS last_source_name
             FROM orders o
             LEFT JOIN branches b ON b.id = o.branch_id
             LEFT JOIN order_sources s ON s.id = o.source_id
             WHERE {$where}",
            $params
        );

        return $row ?: self::emptySummary();
    }

    private static function recentOrdersByPhone(array $variants): array
    {
        [$where, $params] = self::orderPhoneWhere($variants);
        return Database::fetchAll(
            "SELECT o.id, o.order_code, o.customer_name, o.phone, o.order_type, o.workflow_status,
                    o.total, o.address, o.receive_time, o.created_at,
                    b.name AS branch_name, s.name AS source_name
             FROM orders o
             LEFT JOIN branches b ON b.id = o.branch_id
             LEFT JOIN order_sources s ON s.id = o.source_id
             WHERE {$where}
             ORDER BY o.created_at DESC, o.id DESC
             LIMIT 6",
            $params
        );
    }

    private static function orderPhoneWhere(array $variants): array
    {
        return self::phoneWhere(self::phoneSqlExpression('o.phone'), $variants);
    }

    private static function phoneWhere(string $expression, array $variants): array
    {
        $variants = array_values(array_unique(array_filter($variants)));
        if (!$variants) {
            return ['1 = 0', []];
        }

        return [$expression . ' IN (' . implode(',', array_fill(0, count($variants), '?')) . ')', $variants];
    }

    private static function phoneSqlExpression(string $field): string
    {
        return "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE({$field}, ' ', ''), '.', ''), '-', ''), '+', ''), '(', ''), ')', '')";
    }

    private static function phoneVariants(string $normalized): array
    {
        $digits = self::normalizePhone($normalized);
        $variants = [$digits];
        if (str_starts_with($digits, '0') && strlen($digits) > 1) {
            $withoutZero = substr($digits, 1);
            $variants[] = $withoutZero;
            $variants[] = '84' . $withoutZero;
        }
        if (str_starts_with($digits, '84') && strlen($digits) > 2) {
            $variants[] = '0' . substr($digits, 2);
        }

        return array_values(array_unique(array_filter($variants)));
    }

    private static function presentCustomer(?array $customer): ?array
    {
        if (!$customer) {
            return null;
        }

        return [
            'id' => (int) ($customer['id'] ?? 0),
            'phone_display' => (string) ($customer['phone_display'] ?? ''),
            'phone_normalized' => (string) ($customer['phone_normalized'] ?? ''),
            'name' => (string) ($customer['name'] ?? ''),
            'address' => (string) ($customer['address'] ?? ''),
            'is_blacklisted' => (int) ($customer['is_blacklisted'] ?? 0) === 1,
            'blacklist_reason' => (string) ($customer['blacklist_reason'] ?? ''),
            'notes' => (string) ($customer['notes'] ?? ''),
            'updated_at' => $customer['updated_at'] ?? null,
        ];
    }

    private static function presentSummary(array $summary): array
    {
        return [
            'total_orders' => (int) ($summary['total_orders'] ?? 0),
            'completed_orders' => (int) ($summary['completed_orders'] ?? 0),
            'cancelled_orders' => (int) ($summary['cancelled_orders'] ?? 0),
            'active_orders' => (int) ($summary['active_orders'] ?? 0),
            'completed_revenue' => (int) ($summary['completed_revenue'] ?? 0),
            'gross_revenue' => (int) ($summary['gross_revenue'] ?? 0),
            'first_order_at' => $summary['first_order_at'] ?? null,
            'last_order_at' => $summary['last_order_at'] ?? null,
            'last_customer_name' => (string) ($summary['last_customer_name'] ?? ''),
            'last_address' => (string) ($summary['last_address'] ?? ''),
            'last_branch_name' => (string) ($summary['last_branch_name'] ?? ''),
            'last_source_name' => (string) ($summary['last_source_name'] ?? ''),
        ];
    }

    private static function presentOrder(array $order): array
    {
        return [
            'id' => (int) ($order['id'] ?? 0),
            'order_code' => (string) ($order['order_code'] ?? ''),
            'customer_name' => (string) ($order['customer_name'] ?? ''),
            'phone' => (string) ($order['phone'] ?? ''),
            'order_type' => (string) ($order['order_type'] ?? ''),
            'workflow_status' => (string) ($order['workflow_status'] ?? ''),
            'total' => (int) ($order['total'] ?? 0),
            'address' => (string) ($order['address'] ?? ''),
            'receive_time' => (string) ($order['receive_time'] ?? ''),
            'branch_name' => (string) ($order['branch_name'] ?? ''),
            'source_name' => (string) ($order['source_name'] ?? ''),
            'created_at' => $order['created_at'] ?? null,
        ];
    }

    private static function emptySummary(): array
    {
        return [
            'total_orders' => 0,
            'completed_orders' => 0,
            'cancelled_orders' => 0,
            'active_orders' => 0,
            'completed_revenue' => 0,
            'gross_revenue' => 0,
            'first_order_at' => null,
            'last_order_at' => null,
            'last_customer_name' => '',
            'last_address' => '',
            'last_branch_name' => '',
            'last_source_name' => '',
        ];
    }

    private static function nullableInt(mixed $value): ?int
    {
        $value = (int) $value;
        return $value > 0 ? $value : null;
    }
}
