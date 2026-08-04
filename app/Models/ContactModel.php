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
             ORDER BY dc.report_date DESC, b.sort_order, dc.channel, dc.id DESC",
            $params
        );
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
            return 'zalo_oa';
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
