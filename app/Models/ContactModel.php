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
        [$where, $params] = self::whereFromFilters($filters);

        return Database::fetchAll(
            "SELECT dc.*, u.employee_code, u.name AS staff_name, b.name AS branch_name
             FROM daily_contacts dc
             JOIN users u ON u.id = dc.user_id
             LEFT JOIN branches b ON b.id = dc.branch_id
             WHERE {$where}
             ORDER BY dc.report_date DESC, b.sort_order, dc.channel, u.employee_code",
            $params
        );
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
}
