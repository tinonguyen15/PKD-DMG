<?php

namespace App\Models;

use App\Core\Database;

class MenuAlertModel
{
    public const STATUS_PAUSED = 'paused';
    public const STATUS_OUT = 'out';

    public static function activeAlerts(): array
    {
        try {
            self::expireOldPausedAlerts();

            $rows = Database::fetchAll(
                "SELECT a.*, b.name AS branch_name, mi.name AS item_name, u.name AS updated_by_name
                 FROM branch_menu_item_alerts a
                 JOIN branches b ON b.id = a.branch_id
                 JOIN menu_items mi ON mi.id = a.menu_item_id
                 LEFT JOIN users u ON u.id = a.updated_by
                 WHERE a.active = 1
                   AND (a.status = 'out' OR a.paused_until IS NULL OR a.paused_until > NOW())
                 ORDER BY a.updated_at DESC, a.id DESC"
            );
        } catch (\Throwable) {
            return [];
        }

        return array_map([self::class, 'decorate'], $rows);
    }

    public static function setAlert(int $branchId, int $menuItemId, string $status, int $minutes, string $note, int $userId): void
    {
        if ($branchId <= 0 || $menuItemId <= 0) {
            throw new \InvalidArgumentException('Vui lòng chọn chi nhánh và món.');
        }

        if ($status === 'clear') {
            self::clearAlert($branchId, $menuItemId, $userId);
            return;
        }

        if (!in_array($status, [self::STATUS_PAUSED, self::STATUS_OUT], true)) {
            throw new \InvalidArgumentException('Trạng thái cảnh báo không hợp lệ.');
        }

        $minutes = max(0, min(24 * 60, $minutes));
        $pausedUntil = null;
        if ($status === self::STATUS_PAUSED) {
            $minutes = $minutes > 0 ? $minutes : 30;
            $pausedUntil = date('Y-m-d H:i:s', time() + ($minutes * 60));
        }

        Database::execute(
            "INSERT INTO branch_menu_item_alerts
             (branch_id, menu_item_id, status, paused_until, note, active, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)
             ON DUPLICATE KEY UPDATE
               status = VALUES(status),
               paused_until = VALUES(paused_until),
               note = VALUES(note),
               active = 1,
               updated_by = VALUES(updated_by),
               updated_at = NOW()",
            [
                $branchId,
                $menuItemId,
                $status,
                $pausedUntil,
                mb_substr(trim($note), 0, 255, 'UTF-8'),
                $userId > 0 ? $userId : null,
                $userId > 0 ? $userId : null,
            ]
        );
    }

    public static function clearAlert(int $branchId, int $menuItemId, int $userId): void
    {
        Database::execute(
            'UPDATE branch_menu_item_alerts SET active = 0, updated_by = ?, updated_at = NOW() WHERE branch_id = ? AND menu_item_id = ?',
            [$userId > 0 ? $userId : null, $branchId, $menuItemId]
        );
    }

    private static function expireOldPausedAlerts(): void
    {
        Database::execute(
            "UPDATE branch_menu_item_alerts
             SET active = 0, updated_at = NOW()
             WHERE active = 1 AND status = 'paused' AND paused_until IS NOT NULL AND paused_until <= NOW()"
        );
    }

    private static function decorate(array $row): array
    {
        $status = (string) ($row['status'] ?? self::STATUS_PAUSED);
        $remainingSeconds = null;
        if ($status === self::STATUS_PAUSED && !empty($row['paused_until'])) {
            $remainingSeconds = max(0, strtotime((string) $row['paused_until']) - time());
        }

        return [
            'id' => (int) ($row['id'] ?? 0),
            'branch_id' => (int) ($row['branch_id'] ?? 0),
            'menu_item_id' => (int) ($row['menu_item_id'] ?? 0),
            'status' => $status,
            'level' => self::level($status, $remainingSeconds),
            'label' => self::label($status, $remainingSeconds),
            'remaining_seconds' => $remainingSeconds,
            'paused_until' => $row['paused_until'] ?? null,
            'note' => (string) ($row['note'] ?? ''),
            'branch_name' => (string) ($row['branch_name'] ?? ''),
            'item_name' => (string) ($row['item_name'] ?? ''),
            'updated_by_name' => (string) ($row['updated_by_name'] ?? ''),
            'updated_at' => (string) ($row['updated_at'] ?? ''),
        ];
    }

    private static function level(string $status, ?int $remainingSeconds): string
    {
        if ($status === self::STATUS_OUT) {
            return 'out';
        }

        if ($remainingSeconds !== null && $remainingSeconds <= 10 * 60) {
            return 'soon';
        }

        return 'paused';
    }

    private static function label(string $status, ?int $remainingSeconds): string
    {
        if ($status === self::STATUS_OUT) {
            return 'Hết món';
        }

        if ($remainingSeconds === null) {
            return 'Tạm hết';
        }

        $minutes = max(1, (int) ceil($remainingSeconds / 60));
        return 'Tạm hết còn ' . $minutes . 'p';
    }
}
