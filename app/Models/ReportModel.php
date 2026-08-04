<?php

namespace App\Models;

use App\Core\Database;

class ReportModel
{
    public static function orderSummary(array $filters): array
    {
        [$where, $params] = self::orderWhere($filters);
        $guestSubquery = self::estimatedGuestSubquery();

        return Database::fetch(
            "SELECT
                COUNT(*) AS total_orders,
                SUM(o.workflow_status = 'completed') AS completed_orders,
                SUM(o.workflow_status = 'cancelled') AS cancelled_orders,
                SUM(o.workflow_status IN ('processing', 'sent')) AS pipeline_orders,
                COALESCE(SUM(CASE WHEN o.workflow_status = 'completed' THEN o.total ELSE 0 END), 0) AS completed_revenue,
                COALESCE(ROUND(AVG(CASE WHEN o.workflow_status = 'completed' THEN o.total END)), 0) AS average_completed_order,
                COALESCE(SUM(CASE WHEN o.workflow_status = 'completed' THEN eg.estimated_guests ELSE 0 END), 0) AS estimated_completed_guests,
                COALESCE(SUM(CASE WHEN o.workflow_status <> 'cancelled' THEN eg.estimated_guests ELSE 0 END), 0) AS estimated_total_guests,
                COALESCE(ROUND(
                    SUM(CASE WHEN o.workflow_status = 'completed' THEN o.total ELSE 0 END)
                    / NULLIF(SUM(CASE WHEN o.workflow_status = 'completed' THEN eg.estimated_guests ELSE 0 END), 0)
                ), 0) AS average_revenue_per_guest
             FROM orders o
             LEFT JOIN ({$guestSubquery}) eg ON eg.order_id = o.id
             WHERE {$where}",
            $params
        ) ?: [];
    }

    public static function contactSummary(array $filters): array
    {
        [$where, $params] = self::contactWhere($filters);

        return Database::fetch(
            "SELECT
                COALESCE(SUM(received_count), 0) AS received_count,
                COALESCE(SUM(qualified_count), 0) AS qualified_count,
                COALESCE(SUM(order_count), 0) AS manual_order_count,
                COALESCE(SUM(cancelled_count), 0) AS cancelled_count
             FROM daily_contacts dc
             WHERE {$where}",
            $params
        ) ?: [];
    }

    public static function groupOrders(array $filters, string $group): array
    {
        $groups = [
            'staff' => ['u.employee_code, u.name', "CONCAT(u.employee_code, ' - ', u.name)", 'JOIN users u ON u.id = o.user_id'],
            'branch' => ['b.name', 'COALESCE(b.name, "Chưa CN")', 'LEFT JOIN branches b ON b.id = o.branch_id'],
            'source' => ['s.name', 'COALESCE(s.name, "Chưa nguồn")', 'LEFT JOIN order_sources s ON s.id = o.source_id'],
            'type' => ['o.order_type', 'o.order_type', ''],
            'payment' => ['p.name', 'COALESCE(p.name, "Chưa thanh toán")', 'LEFT JOIN payment_methods p ON p.id = o.payment_method_id'],
            'hour' => ['HOUR(o.created_at)', "LPAD(HOUR(o.created_at), 2, '0')", ''],
        ];

        if (!isset($groups[$group])) {
            throw new \InvalidArgumentException('Nhóm báo cáo không hợp lệ.');
        }

        [$groupBy, $label, $join] = $groups[$group];
        [$where, $params] = self::orderWhere($filters);
        $guestSubquery = self::estimatedGuestSubquery();

        return Database::fetchAll(
            "SELECT {$label} AS label,
                    COUNT(*) AS total_orders,
                    SUM(o.workflow_status = 'completed') AS completed_orders,
                    SUM(o.workflow_status = 'cancelled') AS cancelled_orders,
                    COALESCE(SUM(CASE WHEN o.workflow_status = 'completed' THEN o.total ELSE 0 END), 0) AS completed_revenue,
                    COALESCE(SUM(CASE WHEN o.workflow_status = 'completed' THEN eg.estimated_guests ELSE 0 END), 0) AS estimated_completed_guests,
                    COALESCE(ROUND(
                        SUM(CASE WHEN o.workflow_status = 'completed' THEN o.total ELSE 0 END)
                        / NULLIF(SUM(CASE WHEN o.workflow_status = 'completed' THEN eg.estimated_guests ELSE 0 END), 0)
                    ), 0) AS average_revenue_per_guest
             FROM orders o
             {$join}
             LEFT JOIN ({$guestSubquery}) eg ON eg.order_id = o.id
             WHERE {$where}
             GROUP BY {$groupBy}
             ORDER BY completed_revenue DESC, completed_orders DESC, label",
            $params
        );
    }

    public static function groupContacts(array $filters, string $group): array
    {
        $groups = [
            'channel' => ['dc.channel', 'dc.channel', ''],
            'branch' => ['b.name', 'COALESCE(b.name, "Chưa CN")', 'LEFT JOIN branches b ON b.id = dc.branch_id'],
            'staff' => ['u.employee_code, u.name', "CONCAT(u.employee_code, ' - ', u.name)", 'JOIN users u ON u.id = dc.user_id'],
        ];

        if (!isset($groups[$group])) {
            throw new \InvalidArgumentException('Nhóm tiếp cận không hợp lệ.');
        }

        [$groupBy, $label, $join] = $groups[$group];
        [$where, $params] = self::contactWhere($filters);

        return Database::fetchAll(
            "SELECT {$label} AS label,
                    COALESCE(SUM(dc.received_count), 0) AS received_count,
                    COALESCE(SUM(dc.qualified_count), 0) AS qualified_count,
                    COALESCE(SUM(dc.order_count), 0) AS manual_order_count,
                    COALESCE(SUM(dc.cancelled_count), 0) AS cancelled_count
             FROM daily_contacts dc
             {$join}
             WHERE {$where}
             GROUP BY {$groupBy}
             ORDER BY received_count DESC, label",
            $params
        );
    }

    public static function itemSales(array $filters): array
    {
        [$where, $params] = self::orderWhere($filters);
        $guestCase = self::estimatedGuestItemCase('oi', 'mi');

        return Database::fetchAll(
            "SELECT oi.item_name,
                    SUM(oi.quantity) AS quantity,
                    SUM(CASE WHEN o.workflow_status = 'completed' THEN oi.line_total ELSE 0 END) AS completed_revenue,
                    COALESCE(SUM(CASE WHEN o.workflow_status = 'completed' THEN {$guestCase} ELSE 0 END), 0) AS estimated_completed_guests
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
             WHERE {$where} AND o.workflow_status <> 'cancelled'
             GROUP BY oi.item_name
             ORDER BY quantity DESC, completed_revenue DESC
             LIMIT 20",
            $params
        );
    }

    public static function detailOrders(array $filters): array
    {
        return self::withEstimatedGuestMetrics(OrderModel::all($filters));
    }

    public static function withEstimatedGuestMetrics(array $orders): array
    {
        $ids = array_values(array_unique(array_filter(array_map(
            static fn(array $order): int => (int) ($order['id'] ?? 0),
            $orders
        ))));
        $guestMap = self::estimatedGuestsByOrderIds($ids);

        foreach ($orders as &$order) {
            $estimatedGuests = (int) ($guestMap[(int) ($order['id'] ?? 0)] ?? 0);
            $order['estimated_guests'] = $estimatedGuests;
            $order['average_revenue_per_guest'] = ($order['workflow_status'] ?? '') === 'completed' && $estimatedGuests > 0
                ? (int) round((int) ($order['total'] ?? 0) / $estimatedGuests)
                : 0;
        }
        unset($order);

        return $orders;
    }

    public static function estimatedGuestsByOrderIds(array $orderIds): array
    {
        $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
        if (!$orderIds) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($orderIds), '?'));
        $rows = Database::fetchAll(
            "SELECT eg.order_id, eg.estimated_guests
             FROM (" . self::estimatedGuestSubquery() . ") eg
             WHERE eg.order_id IN ({$placeholders})",
            $orderIds
        );

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row['order_id']] = (int) $row['estimated_guests'];
        }

        return $map;
    }

    private static function orderWhere(array $filters): array
    {
        $where = [];
        $params = [];

        if (!\is_admin()) {
            $where[] = 'o.user_id = ?';
            $params[] = \current_user()['id'];
        } elseif (!empty($filters['user_id'])) {
            $where[] = 'o.user_id = ?';
            $params[] = (int) $filters['user_id'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'DATE(o.created_at) >= ?';
            $params[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'DATE(o.created_at) <= ?';
            $params[] = $filters['date_to'];
        }
        if (!empty($filters['branch_id'])) {
            $where[] = 'o.branch_id = ?';
            $params[] = (int) $filters['branch_id'];
        }
        if (!empty($filters['source_id'])) {
            $where[] = 'o.source_id = ?';
            $params[] = (int) $filters['source_id'];
        }
        if (!empty($filters['order_type'])) {
            $where[] = 'o.order_type = ?';
            $params[] = $filters['order_type'];
        }

        return [$where ? implode(' AND ', $where) : '1 = 1', $params];
    }

    private static function contactWhere(array $filters): array
    {
        $where = [];
        $params = [];

        if (!\is_admin()) {
            $where[] = 'dc.user_id = ?';
            $params[] = \current_user()['id'];
        } elseif (!empty($filters['user_id'])) {
            $where[] = 'dc.user_id = ?';
            $params[] = (int) $filters['user_id'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'dc.report_date >= ?';
            $params[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'dc.report_date <= ?';
            $params[] = $filters['date_to'];
        }
        if (!empty($filters['branch_id'])) {
            $where[] = 'dc.branch_id = ?';
            $params[] = (int) $filters['branch_id'];
        }

        return [$where ? implode(' AND ', $where) : '1 = 1', $params];
    }

    private static function estimatedGuestSubquery(): string
    {
        $guestCase = self::estimatedGuestItemCase('oi', 'mi');

        return "SELECT o2.id AS order_id,
                       CASE
                           WHEN o2.order_type = 'booking' AND COALESCE(o2.guest_count, 0) > 0 THEN o2.guest_count
                           ELSE COALESCE(SUM({$guestCase}), 0)
                       END AS estimated_guests
                FROM orders o2
                LEFT JOIN order_items oi ON oi.order_id = o2.id
                LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
                GROUP BY o2.id, o2.order_type, o2.guest_count";
    }

    private static function estimatedGuestItemCase(string $itemAlias, ?string $menuItemAlias = null): string
    {
        $name = "LOWER(CONCAT_WS(' ', {$itemAlias}.item_name, {$itemAlias}.branch_name, {$itemAlias}.customer_name))";
        $quantity = "COALESCE({$itemAlias}.quantity, 0)";
        $configuredCount = $menuItemAlias !== null
            ? "COALESCE({$menuItemAlias}.estimated_guest_count, 0)"
            : '0';

        return "CASE
                    WHEN {$configuredCount} > 0 THEN {$quantity} * {$configuredCount}
                    WHEN {$name} LIKE '%đặc biệt%' OR {$name} LIKE '%dac biet%' THEN {$quantity} * 5
                    WHEN ({$name} LIKE '%sườn chìa%' OR {$name} LIKE '%suon chia%')
                         AND ({$name} LIKE '%lớn%' OR {$name} LIKE '%lon%') THEN {$quantity} * 4
                    WHEN ({$name} LIKE '%xí quách%' OR {$name} LIKE '%xi quach%')
                         AND ({$name} LIKE '%lớn%' OR {$name} LIKE '%lon%') THEN {$quantity} * 3
                    WHEN ({$name} LIKE '%lẩu%' OR {$name} LIKE '%lau%')
                         AND ({$name} LIKE '%nhỏ%' OR {$name} LIKE '%nho%') THEN {$quantity} * 2
                    ELSE 0
                END";
    }
}
