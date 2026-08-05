<?php

namespace App\Models;

use App\Core\Database;
use PDO;

class OrderModel
{
    public const WORKFLOW_LABELS = [
        'processing' => 'Đang xử lý',
        'sent' => 'Đã gửi CN',
        'completed' => 'Đã hoàn thành',
        'cancelled' => 'Đã hủy',
    ];

    public const TYPE_LABELS = [
        'delivery' => 'Mang về',
        'pickup' => 'Khách ghé lấy',
        'booking' => 'Đặt bàn',
    ];

    public const QUICK_NOTICE_LABELS = [
        'paid_ck' => 'Khách đã CK',
        'call_before_delivery' => 'Gọi trước khi giao',
        'urgent' => 'Khách lấy gấp',
        'invoice' => 'Cần hóa đơn',
    ];

    private const QUICK_NOTICE_SETTING_KEYS = [
        'paid_ck' => 'copy_branch_quick_notice_paid_ck',
        'call_before_delivery' => 'copy_branch_quick_notice_call_before_delivery',
        'urgent' => 'copy_branch_quick_notice_urgent',
        'invoice' => 'copy_branch_quick_notice_invoice',
    ];

    public static function quickNoticeLabelsForPreferences(array $preferences): array
    {
        $labels = [];
        foreach (self::QUICK_NOTICE_LABELS as $key => $label) {
            $settingKey = self::QUICK_NOTICE_SETTING_KEYS[$key] ?? '';
            if ($settingKey !== '' && trim((string) ($preferences[$settingKey] ?? '')) !== '') {
                $labels[$key] = $label;
            }
        }

        return $labels;
    }

    public static function all(array $filters = []): array
    {
        [$where, $params] = self::whereFromFilters($filters);

        return Database::fetchAll(
            "SELECT o.*, u.employee_code, u.name AS staff_name, b.name AS branch_name,
                    s.name AS source_name, p.name AS payment_name
             FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN branches b ON b.id = o.branch_id
             LEFT JOIN order_sources s ON s.id = o.source_id
             LEFT JOIN payment_methods p ON p.id = o.payment_method_id
             WHERE {$where}
             ORDER BY o.created_at DESC, o.id DESC",
            $params
        );
    }

    public static function find(int $id): ?array
    {
        $filters = ['id' => $id];
        [$where, $params] = self::whereFromFilters($filters);
        $order = Database::fetch(
            "SELECT o.*, u.employee_code, u.name AS staff_name, b.name AS branch_name,
                    s.name AS source_name, p.name AS payment_name
             FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN branches b ON b.id = o.branch_id
             LEFT JOIN order_sources s ON s.id = o.source_id
             LEFT JOIN payment_methods p ON p.id = o.payment_method_id
             WHERE {$where}
             LIMIT 1",
            $params
        );

        if (!$order) {
            return null;
        }

        $order['items'] = Database::fetchAll(
            'SELECT * FROM order_items WHERE order_id = ? ORDER BY id',
            [$order['id']]
        );

        return $order;
    }

    public static function create(array $data, array $items): int
    {
        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            $orderCode = self::nextCode();
            $total = array_sum(array_column($items, 'line_total'));
            $generatedText = self::generateBranchText($data, $items);
            $now = date('Y-m-d H:i:s');

            Database::execute(
                "INSERT INTO orders
                 (order_code, user_id, branch_id, source_id, payment_method_id, order_type, workflow_status, status_label,
                  customer_name, phone, address, receive_time, guest_count, subtotal, total, note, quick_notice_keys, generated_text,
                  created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $orderCode,
                    (int) $data['user_id'],
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
                    json_encode(self::sanitizeQuickNoticeKeys($data['quick_notice_keys'] ?? []), JSON_UNESCAPED_UNICODE),
                    $generatedText,
                    $now,
                    $now,
                ]
            );

            $orderId = Database::lastInsertId();
            foreach ($items as $item) {
                Database::execute(
                    'INSERT INTO order_items (order_id, menu_item_id, item_name, branch_name, customer_name, item_note, price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        $orderId,
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

            self::audit('orders.create', 'orders', $orderId, ['order_code' => $orderCode, 'total' => $total]);
            $pdo->commit();

            return $orderId;
        } catch (\Throwable $exception) {
            $pdo->rollBack();
            throw $exception;
        }
    }

    public static function updateStatus(int $id, string $workflowStatus): bool
    {
        if (!isset(self::WORKFLOW_LABELS[$workflowStatus])) {
            throw new \InvalidArgumentException('Trạng thái không hợp lệ.');
        }

        $order = self::find($id);
        if (!$order) {
            return false;
        }

        $completedAt = $workflowStatus === 'completed' ? date('Y-m-d H:i:s') : null;
        $cancelledAt = $workflowStatus === 'cancelled' ? date('Y-m-d H:i:s') : null;

        Database::execute(
            'UPDATE orders SET workflow_status = ?, completed_at = ?, cancelled_at = ?, updated_at = ? WHERE id = ?',
            [$workflowStatus, $completedAt, $cancelledAt, date('Y-m-d H:i:s'), $id]
        );

        self::audit('orders.status', 'orders', $id, ['from' => $order['workflow_status'], 'to' => $workflowStatus]);

        return true;
    }

    public static function reassignUser(int $id, int $newUserId): bool
    {
        $order = self::find($id);
        if (!$order) {
            return false;
        }

        $newUser = Database::fetch(
            'SELECT id, employee_code, name, role, active FROM users WHERE id = ? AND active = 1 LIMIT 1',
            [$newUserId]
        );
        if (!$newUser) {
            throw new \InvalidArgumentException('Nhân viên nhận đơn không hợp lệ hoặc đang bị khóa.');
        }

        $oldUserId = (int) $order['user_id'];
        if ($oldUserId === (int) $newUser['id']) {
            return true;
        }

        Database::execute(
            'UPDATE orders SET user_id = ?, updated_at = ? WHERE id = ?',
            [(int) $newUser['id'], date('Y-m-d H:i:s'), $id]
        );

        self::audit('orders.reassign', 'orders', $id, [
            'from_user_id' => $oldUserId,
            'from_employee_code' => $order['employee_code'] ?? '',
            'from_name' => $order['staff_name'] ?? '',
            'to_user_id' => (int) $newUser['id'],
            'to_employee_code' => $newUser['employee_code'] ?? '',
            'to_name' => $newUser['name'] ?? '',
        ]);

        return true;
    }

    public static function deleteOrder(int $id): bool
    {
        $order = self::find($id);
        if (!$order) {
            return false;
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            Database::execute(
                'UPDATE customer_blacklist_entries SET active = 0, removed_by_user_id = ?, removed_at = ?, updated_at = ? WHERE order_id = ?',
                [\current_user()['id'] ?? null, date('Y-m-d H:i:s'), date('Y-m-d H:i:s'), $id]
            );
        } catch (\Throwable) {
            // Bảng blacklist theo đơn là phụ trợ, không chặn xóa đơn nếu production chưa import migration này.
        }

        try {
            self::audit('orders.delete', 'orders', $id, [
                'order_code' => $order['order_code'] ?? '',
                'customer_name' => $order['customer_name'] ?? '',
                'phone' => $order['phone'] ?? '',
                'total' => (int) ($order['total'] ?? 0),
                'user_id' => (int) ($order['user_id'] ?? 0),
                'employee_code' => $order['employee_code'] ?? '',
                'staff_name' => $order['staff_name'] ?? '',
            ]);

            Database::execute('DELETE FROM orders WHERE id = ?', [$id]);
            $pdo->commit();

            return true;
        } catch (\Throwable $exception) {
            $pdo->rollBack();
            throw $exception;
        }
    }

    public static function recentMenuItemIds(int $userId, int $limit = 6): array
    {
        $rows = Database::fetchAll(
            "SELECT oi.menu_item_id, MAX(o.created_at) AS last_ordered_at, COUNT(*) AS total
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = ? AND oi.menu_item_id IS NOT NULL
             GROUP BY oi.menu_item_id
             ORDER BY last_ordered_at DESC, total DESC
             LIMIT {$limit}",
            [$userId]
        );

        return array_values(array_map('intval', array_column($rows, 'menu_item_id')));
    }

    public static function prepareItems(array $quantities, array $notes = []): array
    {
        $items = [];
        foreach ($quantities as $itemId => $quantity) {
            $quantity = max(0, (int) $quantity);
            if ($quantity <= 0) {
                continue;
            }

            $menuItem = CatalogModel::menuItem((int) $itemId);
            if (!$menuItem || empty($menuItem['active'])) {
                continue;
            }

            $note = trim((string) ($notes[$itemId] ?? ''));
            $branchName = trim((string) ($menuItem['branch_name'] ?? '')) ?: $menuItem['name'];
            $customerName = trim((string) ($menuItem['customer_name'] ?? '')) ?: $menuItem['name'];

            $items[] = [
                'menu_item_id' => (int) $menuItem['id'],
                'item_name' => $menuItem['name'],
                'branch_name' => $branchName,
                'customer_name' => $customerName,
                'item_note' => $note,
                'price' => (int) $menuItem['price'],
                'quantity' => $quantity,
                'line_total' => (int) $menuItem['price'] * $quantity,
            ];
        }

        return $items;
    }

    public static function generateBranchText(array $order, array $items): string
    {
        $preferences = PreferenceModel::resolved((int) \current_user()['id']);

        if (($order['order_type'] ?? '') === 'booking') {
            return self::generateBookingBranchText($order, $preferences);
        }

        $isPickup = ($order['order_type'] ?? '') === 'pickup';
        $title = $isPickup ? 'ĐƠN GHÉ LẤY' : 'ĐƠN MANG VỀ';
        $statusLabel = trim((string) ($order['status_label'] ?? '')) ?: 'Done';
        $paymentName = trim((string) ($order['payment_name'] ?? ''));
        $paymentLine = '';
        if ($paymentName !== '' && !$isPickup) {
            $paymentLine = match ($paymentName) {
                'Chuyển khoản' => ' - CK',
                'COD' => ' - COD',
                default => '',
            };
        }

        $lines = [
            $title . ' - ' . $statusLabel . $paymentLine,
            '• Tên: ' . trim((string) ($order['customer_name'] ?? '')),
            '• SĐT: ' . trim((string) ($order['phone'] ?? '')),
        ];

        if (!$isPickup) {
            $lines[] = '• Địa chỉ: ' . trim((string) ($order['address'] ?? ''));
        } else {
            $lines[] = '• Thời gian ghé lấy: ' . (trim((string) ($order['receive_time'] ?? '')) ?: 'Chưa nhập');
        }

        $lines[] = '• Món: ' . self::formatItemsForCopy($items, false);
        $lines[] = '• Tổng tiền: ' . money(array_sum(array_column($items, 'line_total')));

        $note = trim((string) ($order['note'] ?? ''));
        if ($note !== '') {
            $lines[] = '• Ghi chú: ' . $note;
        }

        self::appendQuickNotices($lines, $order, $preferences);
        self::appendBranchFooter($lines, $order, $preferences);

        return implode("\n", $lines);
    }

    public static function generateCustomerText(array $order): string
    {
        $intro = trim((string) PreferenceModel::value('customer_confirmation_intro', ''));
        $footer = trim((string) PreferenceModel::value('customer_confirmation_footer', ''));

        $lines = [];
        if ($intro !== '') {
            $lines[] = $intro;
        } else {
            $lines[] = 'Dạ em xác nhận đơn của mình như sau ạ:';
        }

        $lines[] = '• Tên: ' . trim((string) ($order['customer_name'] ?? ''));
        $lines[] = '• SĐT: ' . trim((string) ($order['phone'] ?? ''));
        if (($order['order_type'] ?? '') === 'delivery') {
            $lines[] = '• Địa chỉ: ' . trim((string) ($order['address'] ?? ''));
        }
        if (($order['order_type'] ?? '') === 'pickup') {
            $lines[] = '• Thời gian ghé lấy: ' . (trim((string) ($order['receive_time'] ?? '')) ?: 'Chưa nhập');
        }
        if (($order['order_type'] ?? '') === 'booking') {
            $lines[] = '• Chi nhánh: ' . (trim((string) ($order['branch_name'] ?? '')) ?: 'Chưa chọn');
            $lines[] = '• Số lượng: ' . ((int) ($order['guest_count'] ?? 0) > 0 ? (int) $order['guest_count'] . ' khách' : 'Chưa nhập');
            $lines[] = '• Thời gian: ' . (trim((string) ($order['receive_time'] ?? '')) ?: 'Chưa nhập');
        }

        if (!empty($order['items'])) {
            $lines[] = '• Món: ' . self::formatItemsForCopy($order['items'], true);
            $lines[] = '• Tổng tiền: ' . money((int) ($order['total'] ?? 0));
        }

        if ($footer !== '') {
            $lines[] = $footer;
        } else {
            $lines[] = 'Mình kiểm tra giúp em thông tin đã đúng chưa nhé.';
        }

        return implode("\n", $lines);
    }

    public static function sanitizeQuickNoticeKeys(array $keys): array
    {
        $valid = array_keys(self::QUICK_NOTICE_LABELS);

        return array_values(array_intersect(array_map('strval', $keys), $valid));
    }

    private static function appendQuickNotices(array &$lines, array $order, array $preferences): void
    {
        $selected = $order['quick_notice_keys'] ?? [];
        if (is_string($selected)) {
            $decoded = json_decode($selected, true);
            $selected = is_array($decoded) ? $decoded : [];
        }

        foreach (self::sanitizeQuickNoticeKeys((array) $selected) as $noticeKey) {
            $settingKey = self::QUICK_NOTICE_SETTING_KEYS[$noticeKey] ?? '';
            $message = trim((string) ($preferences[$settingKey] ?? ''));
            if ($message !== '') {
                $lines[] = $message;
            }
        }
    }

    private static function appendBranchFooter(array &$lines, array $order, array $preferences): void
    {
        $orderType = (string) ($order['order_type'] ?? 'delivery');
        $paymentName = trim((string) ($order['payment_name'] ?? ''));

        $enabled = false;
        $message = '';

        if (!empty($preferences['copy_branch_notice_default_enabled'])) {
            $enabled = true;
            $message = (string) ($preferences['copy_branch_notice_default'] ?? '');
        }

        if ($paymentName === 'Chuyển khoản' && !empty($preferences['copy_branch_notice_bank_transfer_enabled'])) {
            $enabled = true;
            $message = (string) ($preferences['copy_branch_notice_bank_transfer'] ?? $message);
        } elseif ($paymentName === 'COD' && !empty($preferences['copy_branch_notice_cod_enabled'])) {
            $enabled = true;
            $message = (string) ($preferences['copy_branch_notice_cod'] ?? $message);
        } elseif ($orderType === 'pickup' && !empty($preferences['copy_branch_notice_scheduled_enabled'])) {
            $enabled = true;
            $message = (string) ($preferences['copy_branch_notice_scheduled'] ?? $message);
        }

        if ($enabled && trim($message) !== '') {
            $lines[] = trim($message);
        }

        if (!empty($preferences['copy_branch_include_tag'])) {
            $tag = self::branchTagForOrder($order, $preferences);
            if ($tag !== '') {
                $lines[] = $tag;
            }
        }
    }

    private static function branchTagForOrder(array $order, array $preferences): string
    {
        $defaultTag = trim((string) ($preferences['copy_branch_tag_text'] ?? ''));
        $byBranch = $preferences['copy_branch_tag_by_branch'] ?? [];
        if (is_string($byBranch)) {
            $decoded = json_decode($byBranch, true);
            $byBranch = is_array($decoded) ? $decoded : [];
        }

        $branchId = (string) ((int) ($order['branch_id'] ?? 0));
        $branchTag = trim((string) ($byBranch[$branchId] ?? ''));

        if ($branchTag !== '') {
            return $branchTag;
        }

        if (!empty($preferences['copy_branch_tag_require_branch_match']) && $branchId === '0') {
            return '';
        }

        return $defaultTag;
    }

    public static function typeLabel(string $type): string
    {
        return self::TYPE_LABELS[$type] ?? $type;
    }

    public static function workflowLabel(string $status): string
    {
        return self::WORKFLOW_LABELS[$status] ?? $status;
    }

    private static function whereFromFilters(array $filters): array
    {
        $where = [];
        $params = [];
        $user = \current_user();

        if (!\is_admin()) {
            $where[] = 'o.user_id = ?';
            $params[] = $user['id'];
        } elseif (!empty($filters['user_id'])) {
            $where[] = 'o.user_id = ?';
            $params[] = (int) $filters['user_id'];
        }

        if (!empty($filters['id'])) {
            $where[] = 'o.id = ?';
            $params[] = (int) $filters['id'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'DATE(o.created_at) >= ?';
            $params[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'DATE(o.created_at) <= ?';
            $params[] = $filters['date_to'];
        }
        if (!empty($filters['workflow_status'])) {
            $where[] = 'o.workflow_status = ?';
            $params[] = $filters['workflow_status'];
        }
        if (!empty($filters['branch_id'])) {
            $where[] = 'o.branch_id = ?';
            $params[] = (int) $filters['branch_id'];
        }
        if (!empty($filters['source_id'])) {
            $where[] = 'o.source_id = ?';
            $params[] = $filters['source_id'];
        }
        if (!empty($filters['order_type'])) {
            $where[] = 'o.order_type = ?';
            $params[] = $filters['order_type'];
        }
        if (!empty($filters['q'])) {
            $where[] = '(o.order_code LIKE ? OR o.customer_name LIKE ? OR o.phone LIKE ? OR o.note LIKE ?)';
            $q = '%' . $filters['q'] . '%';
            array_push($params, $q, $q, $q, $q);
        }

        return [$where ? implode(' AND ', $where) : '1 = 1', $params];
    }

    private static function nextCode(): string
    {
        $prefix = 'PKD-' . date('ymd') . '-';
        $row = Database::fetch(
            'SELECT COUNT(*) AS total FROM orders WHERE order_code LIKE ?',
            [$prefix . '%']
        );

        return $prefix . str_pad((string) (((int) ($row['total'] ?? 0)) + 1), 3, '0', STR_PAD_LEFT);
    }

    private static function nullableInt(mixed $value): ?int
    {
        $value = (int) $value;

        return $value > 0 ? $value : null;
    }

    private static function generateBookingBranchText(array $data, array $preferences): string
    {
        $lines = [
            'KHÁCH ĐẶT BÀN :',
            '• Tên khách: ' . trim((string) ($data['customer_name'] ?? '')),
            '• SĐT: ' . trim((string) ($data['phone'] ?? '')),
            '• Số lượng: ' . ((int) ($data['guest_count'] ?? 0) > 0 ? (int) $data['guest_count'] . ' khách' : 'Chưa nhập'),
            '• Thời gian: ' . (trim((string) ($data['receive_time'] ?? '')) ?: 'Chưa nhập'),
            '• Chi nhánh: ' . (trim((string) ($data['branch_name'] ?? '')) ?: 'Chưa chọn'),
            '• Ghi chú: ' . (trim((string) ($data['note'] ?? '')) ?: 'Không có'),
        ];

        self::appendBranchFooter($lines, $data, $preferences);

        return implode("\n", $lines);
    }

    private static function formatItemsForCopy(array $items, bool $forCustomer): string
    {
        $chunks = [];
        foreach ($items as $item) {
            $name = $forCustomer
                ? (trim((string) ($item['customer_name'] ?? '')) ?: $item['item_name'])
                : (trim((string) ($item['branch_name'] ?? '')) ?: $item['item_name']);
            $quantity = (int) ($item['quantity'] ?? 0);
            $note = trim((string) ($item['item_note'] ?? ''));

            $text = $quantity > 1 ? $name . ' x' . $quantity : $name;
            if ($note !== '') {
                $text .= ' (' . $note . ')';
            }
            $chunks[] = $text;
        }

        return implode(', ', $chunks);
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
