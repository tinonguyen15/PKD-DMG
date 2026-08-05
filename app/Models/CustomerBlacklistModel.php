<?php

namespace App\Models;

use App\Core\Database;

class CustomerBlacklistModel
{
    public static function attachToProfile(array $profile): array
    {
        $phone = (string) ($profile['phone'] ?? $profile['phone_normalized'] ?? '');
        $blacklist = self::summaryForPhone($phone);
        $profile['blacklist'] = $blacklist;

        if (!empty($profile['customer'])) {
            $profile['customer']['is_blacklisted'] = $blacklist['active_count'] > 0;
            $profile['customer']['blacklist_reason'] = (string) ($blacklist['latest_reason'] ?? ($profile['customer']['blacklist_reason'] ?? ''));
        }

        return $profile;
    }

    public static function summaryForPhone(string $phone): array
    {
        $normalized = CustomerModel::normalizePhone($phone);
        if ($normalized === '' || strlen($normalized) < 8) {
            return self::emptySummary();
        }

        try {
            $events = self::eventsForPhone($normalized);
            $active = array_values(array_filter($events, static fn (array $event): bool => !empty($event['active'])));

            return [
                'active_count' => count($active),
                'total_count' => count($events),
                'latest_reason' => (string) ($active[0]['reason'] ?? $events[0]['reason'] ?? ''),
                'latest_at' => $active[0]['added_at'] ?? $events[0]['added_at'] ?? null,
                'events' => $events,
            ];
        } catch (\Throwable) {
            return self::emptySummary();
        }
    }

    public static function setForOrder(array $order, bool $blacklisted, string $reason, int $userId): void
    {
        $orderId = (int) ($order['id'] ?? 0);
        $phone = trim((string) ($order['phone'] ?? ''));
        $normalized = CustomerModel::normalizePhone($phone);
        if ($orderId <= 0 || $normalized === '' || strlen($normalized) < 8) {
            throw new \InvalidArgumentException('Đơn hàng hoặc số điện thoại không hợp lệ.');
        }

        $now = date('Y-m-d H:i:s');
        $reason = mb_substr(trim($reason), 0, 255, 'UTF-8');
        $userId = $userId > 0 ? $userId : 0;

        CustomerModel::touchFromOrder([
            'phone' => $phone,
            'customer_name' => (string) ($order['customer_name'] ?? ''),
            'address' => (string) ($order['address'] ?? ''),
            'branch_id' => $order['branch_id'] ?? null,
            'source_id' => $order['source_id'] ?? null,
        ], $orderId);

        $customer = self::customerByPhone($normalized);
        $customerId = $customer ? (int) $customer['id'] : null;

        Database::execute(
            "INSERT INTO customer_blacklist_entries
             (customer_id, phone_normalized, phone_display, order_id, reason, active, added_by_user_id, added_at, removed_by_user_id, removed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                customer_id = COALESCE(VALUES(customer_id), customer_id),
                phone_normalized = VALUES(phone_normalized),
                phone_display = VALUES(phone_display),
                reason = CASE WHEN VALUES(active) = 1 THEN VALUES(reason) ELSE reason END,
                active = VALUES(active),
                added_by_user_id = CASE WHEN VALUES(active) = 1 THEN VALUES(added_by_user_id) ELSE added_by_user_id END,
                added_at = CASE WHEN VALUES(active) = 1 THEN VALUES(added_at) ELSE added_at END,
                removed_by_user_id = CASE WHEN VALUES(active) = 0 THEN VALUES(removed_by_user_id) ELSE NULL END,
                removed_at = CASE WHEN VALUES(active) = 0 THEN VALUES(removed_at) ELSE NULL END,
                updated_at = VALUES(updated_at)",
            [
                $customerId,
                $normalized,
                $phone,
                $orderId,
                $reason,
                $blacklisted ? 1 : 0,
                $blacklisted ? $userId : null,
                $blacklisted ? $now : $now,
                $blacklisted ? null : $userId,
                $blacklisted ? null : $now,
                $now,
                $now,
            ]
        );

        self::logAction($customerId, $normalized, $phone, $orderId, $blacklisted ? 'add' : 'remove', $reason, $userId, $now);
        self::syncCustomerState($normalized);
    }

    public static function orderEntry(int $orderId): ?array
    {
        if ($orderId <= 0) {
            return null;
        }

        try {
            $row = Database::fetch(
                "SELECT e.*, u.name AS added_by_name, u.employee_code AS added_by_code,
                        ru.name AS removed_by_name, ru.employee_code AS removed_by_code
                 FROM customer_blacklist_entries e
                 LEFT JOIN users u ON u.id = e.added_by_user_id
                 LEFT JOIN users ru ON ru.id = e.removed_by_user_id
                 WHERE e.order_id = ?
                 LIMIT 1",
                [$orderId]
            );

            return $row ? self::presentEvent($row) : null;
        } catch (\Throwable) {
            return null;
        }
    }

    public static function rows(array $filters = []): array
    {
        $where = ['e.active = 1'];
        $params = [];
        $q = trim((string) ($filters['q'] ?? ''));
        if ($q !== '') {
            $where[] = '(e.phone_display LIKE ? OR e.phone_normalized LIKE ? OR c.name LIKE ? OR e.reason LIKE ? OR o.order_code LIKE ? OR o.customer_name LIKE ?)';
            $like = '%' . $q . '%';
            array_push($params, $like, $like, $like, $like, $like, $like);
        }

        $events = Database::fetchAll(
            "SELECT e.*, c.name, c.address,
                    o.order_code, o.customer_name AS order_customer_name, o.workflow_status AS order_status,
                    o.total AS order_total, o.created_at AS order_created_at, o.order_type,
                    b.name AS order_branch_name, s.name AS order_source_name,
                    u.name AS added_by_name, u.employee_code AS added_by_code
             FROM customer_blacklist_entries e
             LEFT JOIN customers c ON c.id = e.customer_id
             LEFT JOIN orders o ON o.id = e.order_id
             LEFT JOIN branches b ON b.id = o.branch_id
             LEFT JOIN order_sources s ON s.id = o.source_id
             LEFT JOIN users u ON u.id = e.added_by_user_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY e.phone_normalized ASC, e.added_at DESC, e.id DESC",
            $params
        );

        $grouped = [];
        foreach ($events as $event) {
            $key = (string) ($event['phone_normalized'] ?? '');
            if ($key === '') {
                continue;
            }
            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'phone_normalized' => $key,
                    'phone_display' => (string) ($event['phone_display'] ?? $key),
                    'name' => (string) ($event['name'] ?: $event['order_customer_name'] ?: ''),
                    'address' => (string) ($event['address'] ?? ''),
                    'active_count' => 0,
                    'latest_reason' => (string) ($event['reason'] ?? ''),
                    'latest_at' => $event['added_at'] ?? null,
                    'events' => [],
                ];
            }
            $grouped[$key]['active_count']++;
            $grouped[$key]['events'][] = self::presentEvent($event);
        }

        usort($grouped, static function (array $a, array $b): int {
            return strcmp((string) ($b['latest_at'] ?? ''), (string) ($a['latest_at'] ?? ''));
        });

        return array_values($grouped);
    }

    public static function stats(): array
    {
        $row = Database::fetch(
            "SELECT
                COUNT(DISTINCT CASE WHEN active = 1 THEN phone_normalized END) AS total_customers,
                COALESCE(SUM(active = 1), 0) AS active_entries,
                COALESCE(SUM(active = 1 AND added_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)), 0) AS last_7_days,
                COALESCE(SUM(active = 1 AND added_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)), 0) AS last_30_days
             FROM customer_blacklist_entries"
        );

        return [
            'total' => (int) ($row['total_customers'] ?? 0),
            'active_entries' => (int) ($row['active_entries'] ?? 0),
            'last_7_days' => (int) ($row['last_7_days'] ?? 0),
            'last_30_days' => (int) ($row['last_30_days'] ?? 0),
        ];
    }

    private static function eventsForPhone(string $normalized): array
    {
        $variants = self::phoneVariants($normalized);
        $where = 'e.phone_normalized IN (' . implode(',', array_fill(0, count($variants), '?')) . ')';

        $rows = Database::fetchAll(
            "SELECT e.*, c.name, c.address,
                    o.order_code, o.customer_name AS order_customer_name, o.workflow_status AS order_status,
                    o.total AS order_total, o.created_at AS order_created_at, o.order_type,
                    b.name AS order_branch_name, s.name AS order_source_name,
                    u.name AS added_by_name, u.employee_code AS added_by_code
             FROM customer_blacklist_entries e
             LEFT JOIN customers c ON c.id = e.customer_id
             LEFT JOIN orders o ON o.id = e.order_id
             LEFT JOIN branches b ON b.id = o.branch_id
             LEFT JOIN order_sources s ON s.id = o.source_id
             LEFT JOIN users u ON u.id = e.added_by_user_id
             WHERE {$where}
             ORDER BY e.active DESC, e.added_at DESC, e.id DESC",
            $variants
        );

        return array_map([self::class, 'presentEvent'], $rows);
    }

    private static function syncCustomerState(string $normalized): void
    {
        $latest = Database::fetch(
            "SELECT * FROM customer_blacklist_entries
             WHERE phone_normalized = ? AND active = 1
             ORDER BY added_at DESC, id DESC
             LIMIT 1",
            [$normalized]
        );

        if ($latest) {
            Database::execute(
                "UPDATE customers
                 SET is_blacklisted = 1,
                     blacklist_reason = ?,
                     blacklisted_by_user_id = ?,
                     blacklisted_order_id = ?,
                     blacklisted_at = ?,
                     updated_at = ?
                 WHERE phone_normalized = ?",
                [
                    (string) ($latest['reason'] ?? ''),
                    $latest['added_by_user_id'] ?? null,
                    $latest['order_id'] ?? null,
                    $latest['added_at'] ?? date('Y-m-d H:i:s'),
                    date('Y-m-d H:i:s'),
                    $normalized,
                ]
            );
            return;
        }

        Database::execute(
            "UPDATE customers
             SET is_blacklisted = 0,
                 blacklist_reason = '',
                 updated_at = ?
             WHERE phone_normalized = ?",
            [date('Y-m-d H:i:s'), $normalized]
        );
    }

    private static function customerByPhone(string $normalized): ?array
    {
        return Database::fetch(
            'SELECT * FROM customers WHERE phone_normalized = ? LIMIT 1',
            [$normalized]
        ) ?: null;
    }

    private static function phoneVariants(string $normalized): array
    {
        $digits = CustomerModel::normalizePhone($normalized);
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

    private static function presentEvent(array $row): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'active' => (int) ($row['active'] ?? 0) === 1,
            'phone_display' => (string) ($row['phone_display'] ?? ''),
            'phone_normalized' => (string) ($row['phone_normalized'] ?? ''),
            'reason' => (string) ($row['reason'] ?? ''),
            'order_id' => (int) ($row['order_id'] ?? 0),
            'order_code' => (string) ($row['order_code'] ?? ''),
            'order_customer_name' => (string) ($row['order_customer_name'] ?? ''),
            'order_status' => (string) ($row['order_status'] ?? ''),
            'order_total' => (int) ($row['order_total'] ?? 0),
            'order_created_at' => $row['order_created_at'] ?? null,
            'order_type' => (string) ($row['order_type'] ?? ''),
            'order_branch_name' => (string) ($row['order_branch_name'] ?? ''),
            'order_source_name' => (string) ($row['order_source_name'] ?? ''),
            'added_by_name' => (string) ($row['added_by_name'] ?? ''),
            'added_by_code' => (string) ($row['added_by_code'] ?? ''),
            'added_at' => $row['added_at'] ?? null,
            'removed_at' => $row['removed_at'] ?? null,
        ];
    }

    private static function logAction(?int $customerId, string $normalized, string $phone, int $orderId, string $action, string $reason, int $userId, string $createdAt): void
    {
        try {
            Database::execute(
                "INSERT INTO customer_blacklist_logs
                 (customer_id, phone_normalized, phone_display, order_id, action, reason, user_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [$customerId, $normalized, $phone, $orderId, $action, $reason, $userId ?: null, $createdAt]
            );
        } catch (\Throwable) {
            // Bảng log là phụ trợ, không làm hỏng luồng chính nếu production chưa import bảng cũ.
        }
    }

    private static function emptySummary(): array
    {
        return [
            'active_count' => 0,
            'total_count' => 0,
            'latest_reason' => '',
            'latest_at' => null,
            'events' => [],
        ];
    }
}
