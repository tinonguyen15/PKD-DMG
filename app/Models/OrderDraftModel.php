<?php

namespace App\Models;

use App\Core\Database;

class OrderDraftModel
{
    public const LIMIT = 20;

    public static function forUser(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }

        $rows = Database::fetchAll(
            "SELECT id, order_type, customer_name, phone, item_count, total, payload_json, created_at, updated_at
             FROM order_drafts
             WHERE user_id = ?
             ORDER BY updated_at DESC, id DESC
             LIMIT " . self::LIMIT,
            [$userId]
        );

        return array_map([self::class, 'normalizeRow'], $rows);
    }

    public static function save(int $userId, int $draftId, array $payload): array
    {
        if ($userId <= 0) {
            throw new \InvalidArgumentException('Người dùng không hợp lệ.');
        }

        $payload = self::sanitizePayload($payload);
        $summary = self::summaryFromPayload($payload);
        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($payloadJson === false) {
            throw new \InvalidArgumentException('Dữ liệu nháp không hợp lệ.');
        }

        if ($draftId > 0 && self::belongsToUser($draftId, $userId)) {
            Database::execute(
                "UPDATE order_drafts
                 SET order_type = ?, customer_name = ?, phone = ?, item_count = ?, total = ?, payload_json = ?, updated_at = NOW()
                 WHERE id = ? AND user_id = ?",
                [
                    $summary['order_type'],
                    $summary['customer_name'],
                    $summary['phone'],
                    $summary['item_count'],
                    $summary['total'],
                    $payloadJson,
                    $draftId,
                    $userId,
                ]
            );

            return self::findForUser($draftId, $userId) ?: [];
        }

        Database::execute(
            "INSERT INTO order_drafts (user_id, order_type, customer_name, phone, item_count, total, payload_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $userId,
                $summary['order_type'],
                $summary['customer_name'],
                $summary['phone'],
                $summary['item_count'],
                $summary['total'],
                $payloadJson,
            ]
        );

        $insertId = Database::lastInsertId();
        self::trimForUser($userId);

        return self::findForUser($insertId, $userId) ?: [];
    }

    public static function deleteForUser(int $draftId, int $userId): bool
    {
        if ($draftId <= 0 || $userId <= 0) {
            return false;
        }

        return Database::execute('DELETE FROM order_drafts WHERE id = ? AND user_id = ?', [$draftId, $userId]);
    }

    private static function findForUser(int $draftId, int $userId): ?array
    {
        $row = Database::fetch(
            "SELECT id, order_type, customer_name, phone, item_count, total, payload_json, created_at, updated_at
             FROM order_drafts
             WHERE id = ? AND user_id = ?
             LIMIT 1",
            [$draftId, $userId]
        );

        return $row ? self::normalizeRow($row) : null;
    }

    private static function belongsToUser(int $draftId, int $userId): bool
    {
        return (bool) Database::fetch(
            'SELECT id FROM order_drafts WHERE id = ? AND user_id = ? LIMIT 1',
            [$draftId, $userId]
        );
    }

    private static function normalizeRow(array $row): array
    {
        $payload = json_decode((string) ($row['payload_json'] ?? '{}'), true);
        if (!is_array($payload)) {
            $payload = [];
        }

        unset($row['payload_json']);
        $row['id'] = (int) $row['id'];
        $row['item_count'] = (int) ($row['item_count'] ?? 0);
        $row['total'] = (int) ($row['total'] ?? 0);
        $row['payload'] = self::sanitizePayload($payload);

        return $row;
    }

    private static function sanitizePayload(array $payload): array
    {
        $orderType = (string) ($payload['order_type'] ?? 'delivery');
        if (!array_key_exists($orderType, OrderModel::TYPE_LABELS)) {
            $orderType = 'delivery';
        }

        $items = [];
        foreach ((array) ($payload['items'] ?? []) as $id => $quantity) {
            $id = (int) $id;
            $quantity = max(0, (int) $quantity);
            if ($id > 0 && $quantity > 0) {
                $items[(string) $id] = min($quantity, 99);
            }
        }

        $itemNotes = [];
        foreach ((array) ($payload['item_notes'] ?? []) as $id => $note) {
            $id = (int) $id;
            $note = mb_substr(trim((string) $note), 0, 255, 'UTF-8');
            if ($id > 0 && $note !== '') {
                $itemNotes[(string) $id] = $note;
            }
        }

        return [
            'order_type' => $orderType,
            'source_id' => max(0, (int) ($payload['source_id'] ?? 0)),
            'customer_name' => mb_substr(trim((string) ($payload['customer_name'] ?? '')), 0, 160, 'UTF-8'),
            'phone' => mb_substr(trim((string) ($payload['phone'] ?? '')), 0, 40, 'UTF-8'),
            'branch_id' => max(0, (int) ($payload['branch_id'] ?? 0)),
            'address' => mb_substr(trim((string) ($payload['address'] ?? '')), 0, 255, 'UTF-8'),
            'receive_time' => mb_substr(trim((string) ($payload['receive_time'] ?? '')), 0, 80, 'UTF-8'),
            'payment_method_id' => max(0, (int) ($payload['payment_method_id'] ?? 0)),
            'guest_count' => max(0, (int) ($payload['guest_count'] ?? 0)),
            'note' => mb_substr(trim((string) ($payload['note'] ?? '')), 0, 500, 'UTF-8'),
            'quick_notices' => OrderModel::sanitizeQuickNoticeKeys($payload['quick_notices'] ?? []),
            'items' => $items,
            'item_notes' => $itemNotes,
        ];
    }

    private static function summaryFromPayload(array $payload): array
    {
        $items = OrderModel::prepareItems($payload['items'] ?? [], $payload['item_notes'] ?? []);

        return [
            'order_type' => $payload['order_type'] ?? 'delivery',
            'customer_name' => $payload['customer_name'] !== '' ? $payload['customer_name'] : 'Chưa nhập tên',
            'phone' => $payload['phone'] ?? '',
            'item_count' => array_sum(array_column($items, 'quantity')),
            'total' => array_sum(array_column($items, 'line_total')),
        ];
    }

    private static function trimForUser(int $userId): void
    {
        Database::execute(
            "DELETE od FROM order_drafts od
             LEFT JOIN (
                SELECT id
                FROM order_drafts
                WHERE user_id = ?
                ORDER BY updated_at DESC, id DESC
                LIMIT " . self::LIMIT . "
             ) keep_rows ON keep_rows.id = od.id
             WHERE od.user_id = ? AND keep_rows.id IS NULL",
            [$userId, $userId]
        );
    }
}
