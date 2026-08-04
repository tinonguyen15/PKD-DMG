<?php

namespace App\Models;

use App\Core\Database;

class ContactModel
{
    public const CHANNELS = [
        'hotline_1900' => 'Hotline 1900',
        'branch_phone' => 'SĐT chi nhánh',
        'zalo_branch' => 'Zalo CN',
        'zalo_oa' => 'Zalo OA',
        'facebook_page' => 'Page FB',
        'fb_ads' => 'FB Ads',
        'other' => 'Kênh khác',
    ];

    public static function all(array $filters = []): array
    {
        self::ensureRowsForOrders($filters);
        [$where, $params] = self::whereFromFilters($filters);

        $rows = Database::fetchAll(
            "SELECT
                MIN(dc.id) AS id,
                dc.report_date,
                dc.branch_id,
                dc.channel,
                SUM(dc.received_count) AS received_count,
                SUM(dc.qualified_count) AS qualified_count,
                SUM(dc.cancelled_count) AS cancelled_count,
                GROUP_CONCAT(DISTINCT CONCAT(u.employee_code, ' - ', u.name) ORDER BY u.employee_code SEPARATOR ', ') AS staff_name,
                b.name AS branch_name
             FROM daily_contacts dc
             JOIN users u ON u.id = dc.user_id
             LEFT JOIN branches b ON b.id = dc.branch_id
             WHERE {$where}
             GROUP BY dc.report_date, dc.branch_id, dc.channel, b.name
             ORDER BY dc.report_date DESC, b.sort_order, dc.channel",
            $params
        );

        return self::attachOrderMetrics($rows, $filters);
    }

    public static function ensureRowsForOrders(array $filters = []): void
    {
        foreach (self::orderMetrics($filters) as $metric) {
            if ((int) $metric['branch_id'] <= 0 || (int) $metric['order_count'] <= 0) {
                continue;
            }

            self::ensureRow([
                'report_date' => $metric['report_date'],
                'user_id' => (int) ($metric['user_id'] ?: \current_user()['id']),
                'branch_id' => (int) $metric['branch_id'],
                'channel' => (string) $metric['channel'],
            ]);
        }
    }

    public static function ensureRow(array $data): void
    {
        Database::execute(
            "INSERT INTO daily_contacts
             (report_date, user_id, branch_id, channel, received_count, qualified_count, order_count, cancelled_count, note)
             VALUES (?, ?, ?, ?, 0, 0, 0, 0, '')
             ON DUPLICATE KEY UPDATE updated_at = NOW()",
            [
                $data['report_date'],
                (int) $data['user_id'],
                (int) $data['branch_id'],
                $data['channel'],
            ]
        );
    }

    public static function saveReceivedByScope(array $data): void
    {
        $reportDate = (string) $data['report_date'];
        $branchId = (int) $data['branch_id'];
        $channel = (string) $data['channel'];
        $receivedCount = max(0, (int) ($data['received_count'] ?? 0));

        if (\is_admin()) {
            $existing = Database::fetch(
                'SELECT id, user_id FROM daily_contacts WHERE report_date = ? AND branch_id = ? AND channel = ? ORDER BY id LIMIT 1',
                [$reportDate, $branchId, $channel]
            );

            if (!$existing) {
                self::ensureRow([
                    'report_date' => $reportDate,
                    'user_id' => (int) \current_user()['id'],
                    'branch_id' => $branchId,
                    'channel' => $channel,
                ]);
                $existing = Database::fetch(
                    'SELECT id, user_id FROM daily_contacts WHERE report_date = ? AND branch_id = ? AND channel = ? ORDER BY id LIMIT 1',
                    [$reportDate, $branchId, $channel]
                );
            }

            Database::execute(
                'UPDATE daily_contacts SET received_count = 0, updated_at = NOW() WHERE report_date = ? AND branch_id = ? AND channel = ?',
                [$reportDate, $branchId, $channel]
            );
            Database::execute(
                'UPDATE daily_contacts SET received_count = ?, updated_at = NOW() WHERE id = ?',
                [$receivedCount, (int) ($existing['id'] ?? 0)]
            );
            return;
        }

        self::ensureRow([
            'report_date' => $reportDate,
            'user_id' => (int) \current_user()['id'],
            'branch_id' => $branchId,
            'channel' => $channel,
        ]);

        Database::execute(
            "UPDATE daily_contacts
             SET received_count = ?, updated_at = NOW()
             WHERE report_date = ? AND user_id = ? AND branch_id = ? AND channel = ?",
            [$receivedCount, $reportDate, (int) \current_user()['id'], $branchId, $channel]
        );
    }

    public static function saveReceivedCount(int $id, int $receivedCount): void
    {
        $where = 'id = ?';
        $params = [max(0, $receivedCount), $id];

        if (!\is_admin()) {
            $where .= ' AND user_id = ?';
            $params[] = \current_user()['id'];
        }

        Database::execute(
            "UPDATE daily_contacts
             SET received_count = ?, updated_at = NOW()
             WHERE {$where}",
            $params
        );
    }

    public static function touchFromOrder(array $data): void
    {
        $branchId = (int) ($data['branch_id'] ?? 0);
        $userId = (int) ($data['user_id'] ?? 0);
        $channel = self::channelFromOrderSource((string) ($data['source_name'] ?? ''));

        if ($branchId <= 0 || $userId <= 0 || $channel === '') {
            return;
        }

        Database::execute(
            "INSERT INTO daily_contacts
             (report_date, user_id, branch_id, channel, received_count, qualified_count, order_count, cancelled_count, note)
             VALUES (?, ?, ?, ?, 0, 0, 1, 0, '')
             ON DUPLICATE KEY UPDATE
                order_count = order_count + 1,
                updated_at = NOW()",
            [
                \today(),
                $userId,
                $branchId,
                $channel,
            ]
        );
    }

    public static function channelFromOrderSource(string $sourceName): string
    {
        $source = mb_strtolower(trim($sourceName), 'UTF-8');
        $source = strtr($source, [
            'à' => 'a', 'á' => 'a', 'ạ' => 'a', 'ả' => 'a', 'ã' => 'a',
            'â' => 'a', 'ầ' => 'a', 'ấ' => 'a', 'ậ' => 'a', 'ẩ' => 'a', 'ẫ' => 'a',
            'ă' => 'a', 'ằ' => 'a', 'ắ' => 'a', 'ặ' => 'a', 'ẳ' => 'a', 'ẵ' => 'a',
            'è' => 'e', 'é' => 'e', 'ẹ' => 'e', 'ẻ' => 'e', 'ẽ' => 'e',
            'ê' => 'e', 'ề' => 'e', 'ế' => 'e', 'ệ' => 'e', 'ể' => 'e', 'ễ' => 'e',
            'ì' => 'i', 'í' => 'i', 'ị' => 'i', 'ỉ' => 'i', 'ĩ' => 'i',
            'ò' => 'o', 'ó' => 'o', 'ọ' => 'o', 'ỏ' => 'o', 'õ' => 'o',
            'ô' => 'o', 'ồ' => 'o', 'ố' => 'o', 'ộ' => 'o', 'ổ' => 'o', 'ỗ' => 'o',
            'ơ' => 'o', 'ờ' => 'o', 'ớ' => 'o', 'ợ' => 'o', 'ở' => 'o', 'ỡ' => 'o',
            'ù' => 'u', 'ú' => 'u', 'ụ' => 'u', 'ủ' => 'u', 'ũ' => 'u',
            'ư' => 'u', 'ừ' => 'u', 'ứ' => 'u', 'ự' => 'u', 'ử' => 'u', 'ữ' => 'u',
            'ỳ' => 'y', 'ý' => 'y', 'ỵ' => 'y', 'ỷ' => 'y', 'ỹ' => 'y', 'đ' => 'd',
        ]);

        if (str_contains($source, 'zalo')) {
            return str_contains($source, 'oa') ? 'zalo_oa' : 'zalo_branch';
        }
        if (str_contains($source, 'fb ads') || str_contains($source, 'facebook ads')) {
            return 'fb_ads';
        }
        if (str_contains($source, 'facebook') || str_contains($source, 'page')) {
            return 'facebook_page';
        }
        if (str_contains($source, 'hotline')) {
            return 'hotline_1900';
        }
        if (str_contains($source, 'sdt') || str_contains($source, 'dien thoai') || str_contains($source, 'phone')) {
            return 'branch_phone';
        }

        return 'other';
    }

    public static function upsert(array $data): void
    {
        Database::execute(
            "INSERT INTO daily_contacts
             (report_date, user_id, branch_id, channel, received_count, qualified_count, order_count, cancelled_count, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                received_count = VALUES(received_count),
                qualified_count = VALUES(qualified_count),
                order_count = VALUES(order_count),
                cancelled_count = VALUES(cancelled_count),
                note = VALUES(note),
                updated_at = NOW()",
            [
                $data['report_date'],
                (int) $data['user_id'],
                (int) $data['branch_id'],
                $data['channel'],
                max(0, (int) $data['received_count']),
                max(0, (int) $data['qualified_count']),
                max(0, (int) $data['order_count']),
                max(0, (int) $data['cancelled_count']),
                trim((string) ($data['note'] ?? '')),
            ]
        );
    }

    private static function attachOrderMetrics(array $rows, array $filters): array
    {
        $metrics = [];
        foreach (self::orderMetrics($filters) as $metric) {
            $metrics[self::scopeKey((string) $metric['report_date'], (int) $metric['branch_id'], (string) $metric['channel'])] = $metric;
        }

        foreach ($rows as &$row) {
            $key = self::scopeKey((string) $row['report_date'], (int) $row['branch_id'], (string) $row['channel']);
            $metric = $metrics[$key] ?? null;
            $orderCount = (int) ($metric['order_count'] ?? 0);
            $revenue = (int) ($metric['revenue'] ?? 0);

            $row['order_count'] = $orderCount;
            $row['revenue'] = $revenue;
            $row['average_revenue_per_order'] = $orderCount > 0 ? (int) round($revenue / $orderCount) : 0;
        }
        unset($row);

        return $rows;
    }

    private static function orderMetrics(array $filters): array
    {
        [$where, $params] = self::orderWhereFromFilters($filters);
        $rows = Database::fetchAll(
            "SELECT
                DATE(o.created_at) AS report_date,
                MIN(o.user_id) AS user_id,
                o.branch_id,
                COALESCE(s.name, '') AS source_name,
                SUM(CASE WHEN o.workflow_status <> 'cancelled' THEN 1 ELSE 0 END) AS order_count,
                COALESCE(SUM(CASE WHEN o.workflow_status <> 'cancelled' THEN o.total ELSE 0 END), 0) AS revenue
             FROM orders o
             LEFT JOIN order_sources s ON s.id = o.source_id
             WHERE {$where}
             GROUP BY DATE(o.created_at), o.branch_id, COALESCE(s.name, '')",
            $params
        );

        $grouped = [];
        foreach ($rows as $row) {
            $channel = self::channelFromOrderSource((string) $row['source_name']);
            if (!empty($filters['channel']) && $filters['channel'] !== $channel) {
                continue;
            }

            $key = self::scopeKey((string) $row['report_date'], (int) $row['branch_id'], $channel);
            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'report_date' => $row['report_date'],
                    'user_id' => (int) $row['user_id'],
                    'branch_id' => (int) $row['branch_id'],
                    'channel' => $channel,
                    'order_count' => 0,
                    'revenue' => 0,
                ];
            }

            $grouped[$key]['order_count'] += (int) $row['order_count'];
            $grouped[$key]['revenue'] += (int) $row['revenue'];
        }

        return array_values($grouped);
    }

    private static function whereFromFilters(array $filters): array
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
        if (!empty($filters['channel'])) {
            $where[] = 'dc.channel = ?';
            $params[] = $filters['channel'];
        }

        return [$where ? implode(' AND ', $where) : '1 = 1', $params];
    }

    private static function orderWhereFromFilters(array $filters): array
    {
        $where = ['o.branch_id IS NOT NULL', 'o.branch_id > 0'];
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

        return [implode(' AND ', $where), $params];
    }

    private static function scopeKey(string $reportDate, int $branchId, string $channel): string
    {
        return $reportDate . '|' . $branchId . '|' . $channel;
    }
}
