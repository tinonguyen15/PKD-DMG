<?php

namespace App\Models;

use App\Core\Database;

class OrderEditModel
{
    public static function updateProcessingOrder(int $id, array $data, array $items): bool
    {
        $order = OrderModel::find($id);
        if (!$order) {
            return false;
        }

        if (($order['workflow_status'] ?? '') !== 'processing') {
            throw new \InvalidArgumentException('Chỉ sửa được đơn đang ở trạng thái Đang xử lý. Nếu đơn đã gửi CN, hãy kéo về Đang xử lý trước.');
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            $total = array_sum(array_column($items, 'line_total'));
            $generatedText = OrderModel::generateBranchText($data, $items);
            $now = date('Y-m-d H:i:s');

            Database::execute(
                "UPDATE orders
                 SET branch_id = ?, source_id = ?, payment_method_id = ?, order_type = ?, status_label = ?,
                     customer_name = ?, phone = ?, address = ?, receive_time = ?, guest_count = ?,
                     subtotal = ?, total = ?, note = ?, quick_notice_keys = ?, generated_text = ?, updated_at = ?
                 WHERE id = ?",
                [
                    self::nullableInt($data['branch_id'] ?? null),
                    self::nullableInt($data['source_id'] ?? null),
                    self::nullableInt($data['payment_method_id'] ?? null),
                    $data['order_type'],
                    trim((string) ($data['status_label'] ?? '')),
                    trim((string) $data['customer_name']),
                    trim((string) $data['phone']),
                    trim((string) ($data['address'] ?? '')),
                    trim((string) ($data['receive_time'] ?? '')),
                    self::nullableInt($data['guest_count'] ?? null),
                    $total,
                    $total,
                    trim((string) ($data['note'] ?? '')),
                    json_encode(OrderModel::sanitizeQuickNoticeKeys($data['quick_notice_keys'] ?? []), JSON_UNESCAPED_UNICODE),
                    $generatedText,
                    $now,
                    $id,
                ]
            );

            Database::execute('DELETE FROM order_items WHERE order_id = ?', [$id]);
            foreach ($items as $item) {
                Database::execute(
                    'INSERT INTO order_items (order_id, menu_item_id, item_name, branch_name, customer_name, item_note, price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        $id,
                        $item['menu_item_id'],
                        $item['item_name'],
                        $item['branch_name'],
                        $item['customer_name'],
                        $item['item_note'],
                        $item['price'],
                        $item['quantity'],
                        $item['line_total'],
                    ]
                );
            }

            self::audit('orders.update_processing', 'orders', $id, [
                'order_code' => $order['order_code'] ?? '',
                'total' => $total,
            ]);

            $pdo->commit();
            return true;
        } catch (\Throwable $exception) {
            $pdo->rollBack();
            throw $exception;
        }
    }

    private static function nullableInt(mixed $value): ?int
    {
        $value = (int) $value;
        return $value > 0 ? $value : null;
    }

    private static function audit(string $action, string $subjectType, int $subjectId, array $payload = []): void
    {
        Database::execute(
            'INSERT INTO audit_logs (user_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)',
            [
                \current_user()['id'] ?? null,
                $action,
                $subjectType,
                $subjectId,
                $payload ? json_encode($payload, JSON_UNESCAPED_UNICODE) : null,
            ]
        );
    }
}
