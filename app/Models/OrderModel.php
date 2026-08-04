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

            Database::execute(
                "INSERT INTO orders
                 (order_code, user_id, branch_id, source_id, payment_method_id, order_type, workflow_status, status_label,
                  customer_name, phone, address, receive_time, guest_count, subtotal, total, note, quick_notice_keys, generated_text)
                 VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
            'UPDATE orders SET workflow_status = ?, completed_at = ?, cancelled_at = ? WHERE id = ?',
            [$workflowStatus, $completedAt, $cancelledAt, $id]
        );

        self::audit('orders.status', 'orders', $id, ['from' => $order['workflow_status'], 'to' => $workflowStatus]);

        return true;
    }

    public static function prepareItems(array $quantities, array $notes = []): array
    {
        $menuItems = [];
        foreach (CatalogModel::menuItems(true) as $item) {
            $menuItems[(int) $item['id']] = $item;
        }

        $items = [];
        foreach ($quantities as $id => $quantity) {
            $id = (int) $id;
            $quantity = max(0, (int) $quantity);
            if ($quantity < 1 || empty($menuItems[$id])) {
                continue;
            }

            $menuItem = $menuItems[$id];
            $price = (int) $menuItem['price'];
            $items[] = [
                'menu_item_id' => $id,
                'item_name' => $menuItem['name'],
                'branch_name' => $menuItem['branch_name'] ?: $menuItem['name'],
                'customer_name' => $menuItem['customer_name'] ?: $menuItem['name'],
                'item_note' => trim((string) ($notes[$id] ?? '')),
                'price' => $price,
                'quantity' => $quantity,
                'line_total' => $price * $quantity,
            ];
        }

        return $items;
    }

    public static function sanitizeQuickNoticeKeys(array|string|null $keys): array
    {
        if (is_string($keys)) {
            $decoded = json_decode($keys, true);
            $keys = is_array($decoded) ? $decoded : [];
        }

        $clean = [];
        foreach ((array) $keys as $key) {
            $key = (string) $key;
            if (isset(self::QUICK_NOTICE_LABELS[$key])) {
                $clean[$key] = $key;
            }
        }

        return array_values($clean);
    }

    public static function recentMenuItemIds(int $userId, int $limit = 8): array
    {
        if ($userId <= 0) {
            return [];
        }

        $rows = Database::fetchAll(
            "SELECT oi.menu_item_id, MAX(o.created_at) AS last_ordered_at
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = ? AND oi.menu_item_id IS NOT NULL
             GROUP BY oi.menu_item_id
             ORDER BY last_ordered_at DESC
             LIMIT {$limit}",
            [$userId]
        );

        return array_map('intval', array_column($rows, 'menu_item_id'));
    }

    public static function generateBranchText(array $data, array $items, ?array $preferences = null): string
    {
        $preferences ??= PreferenceModel::resolved((int) ($data['user_id'] ?? (\current_user()['id'] ?? 0)));

        if ($data['order_type'] === 'booking') {
            return self::generateBookingBranchText($data, $preferences);
        }

        $title = match ($data['order_type']) {
            'pickup' => 'ĐƠN GHÉ LẤY',
            default => 'ĐƠN MANG VỀ',
        };
        $timeLabel = match ($data['order_type']) {
            'pickup' => 'Thời gian ghé lấy',
            default => 'Thời gian nhận',
        };
        $timeFallback = $data['order_type'] === 'delivery' ? 'Giao ngay' : 'Chưa nhập';
        $lines = [
            $title,
            '',
            '• Chi nhánh: ' . ($data['branch_name'] ?? 'Chưa chọn'),
            '• Tên: ' . trim((string) $data['customer_name']),
            '• SĐT: ' . trim((string) $data['phone']),
        ];

        if ($data['order_type'] === 'delivery') {
            $lines[] = '• Địa chỉ: ' . (trim((string) ($data['address'] ?? '')) ?: 'Chưa nhập');
        }

        foreach ($items as $index => $item) {
            $prefix = $index === 0 ? '• Món: ' : '';
            $price = $item['price'] > 0 ? ' ' . ((int) round($item['price'] / 1000)) . 'k' : '';
            $note = trim((string) ($item['item_note'] ?? ''));
            $lines[] = $prefix . $item['quantity'] . ' ' . $item['branch_name'] . $price . ($note !== '' ? ' - ' . $note : '');
        }

        $lines[] = '• ' . $timeLabel . ': ' . (trim((string) ($data['receive_time'] ?? '')) ?: $timeFallback);
        $lines[] = '• Thanh toán: ' . (trim((string) ($data['payment_name'] ?? '')) ?: 'Chưa chọn');

        self::appendBranchFooter($lines, $data, $preferences);

        return implode("\n", $lines);
    }

    public static function generateCustomerText(array $order, ?array $preferences = null): string
    {
        $preferences ??= PreferenceModel::resolved((int) ($order['user_id'] ?? (\current_user()['id'] ?? 0)));

        if (($order['order_type'] ?? '') === 'booking') {
            return self::generateBookingCustomerText($order, $preferences);
        }

        $items = $order['items'] ?? [];
        $title = ($order['order_type'] ?? '') === 'pickup' ? 'GHÉ LẤY' : 'MANG VỀ';
        $timeLabel = ($order['order_type'] ?? '') === 'pickup' ? 'Thời gian ghé lấy' : 'Thời gian nhận';
        $lines = [
            'XÁC NHẬN ĐƠN ' . $title,
            '',
        ];
        self::appendCustomerIntro($lines, $preferences);
        array_push($lines,
            '• Chi nhánh: ' . ($order['branch_name'] ?? 'Chưa chọn'),
            '• Tên: ' . ($order['customer_name'] ?? ''),
            '• SĐT: ' . ($order['phone'] ?? '')
        );

        if (($order['order_type'] ?? '') === 'delivery') {
            $lines[] = '• Địa chỉ: ' . ($order['address'] ?: 'Chưa nhập');
        }

        foreach ($items as $index => $item) {
            $prefix = $index === 0 ? '• Món: ' : '';
            $note = trim((string) ($item['item_note'] ?? ''));
            $lines[] = $prefix . $item['quantity'] . ' ' . ($item['customer_name'] ?: $item['item_name']) . ($note !== '' ? ' - ' . $note : '');
        }

        $lines[] = '== Tổng tiền món: ' . \money((int) $order['total']) . ' ==';
        $lines[] = '• ' . $timeLabel . ': ' . ($order['receive_time'] ?: '...');
        $lines[] = '• Hình thức thanh toán: ' . ($order['payment_name'] ?? '...');
        self::appendCustomerFooter($lines, $preferences);

        return implode("\n", $lines);
    }

    public static function orderTypeLabel(string $type): string
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
            $params[] = (int) $filters['source_id'];
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

    private static function generateBookingCustomerText(array $data, array $preferences): string
    {
        $lines = [
            'XÁC NHẬN ĐẶT BÀN',
            '',
        ];
        self::appendCustomerIntro($lines, $preferences);
        array_push(
            $lines,
            '• Tên khách: ' . trim((string) ($data['customer_name'] ?? '')),
            '• SĐT: ' . trim((string) ($data['phone'] ?? '')),
            '• Số lượng: ' . ((int) ($data['guest_count'] ?? 0) > 0 ? (int) $data['guest_count'] . ' khách' : 'Chưa nhập'),
            '• Thời gian: ' . (trim((string) ($data['receive_time'] ?? '')) ?: 'Chưa nhập'),
            '• Chi nhánh: ' . (trim((string) ($data['branch_name'] ?? '')) ?: 'Chưa chọn'),
            '• Ghi chú: ' . (trim((string) ($data['note'] ?? '')) ?: 'Không có')
        );
        self::appendCustomerFooter($lines, $preferences);

        return implode("\n", $lines);
    }

    private static function appendBranchFooter(array &$lines, array $data, array $preferences): void
    {
        $footer = [];
        $paymentName = (string) ($data['payment_name'] ?? '');
        $payment = mb_strtolower(trim($paymentName), 'UTF-8');
        if ($payment === 'chuyển khoản') {
            self::pushFooterLine($footer, $preferences, 'copy_branch_notice_bank_transfer_enabled', 'copy_branch_notice_bank_transfer');
        } else {
            self::pushFooterLine($footer, $preferences, 'copy_branch_notice_default_enabled', 'copy_branch_notice_default');
        }
        if (str_contains($payment, 'cod')) {
            self::pushFooterLine($footer, $preferences, 'copy_branch_notice_cod_enabled', 'copy_branch_notice_cod');
        }
        if (self::isScheduledDelivery($data)) {
            self::pushFooterLine($footer, $preferences, 'copy_branch_notice_scheduled_enabled', 'copy_branch_notice_scheduled');
        }

        foreach (self::sanitizeQuickNoticeKeys($data['quick_notice_keys'] ?? []) as $quickNoticeKey) {
            $settingKey = self::QUICK_NOTICE_SETTING_KEYS[$quickNoticeKey] ?? '';
            if ($settingKey !== '') {
                self::pushFooterLineByText($footer, (string) ($preferences[$settingKey] ?? ''));
            }
        }

        $tagText = self::branchTagText($data, $preferences);
        if ($tagText !== '') {
            $footer[] = $tagText;
        }

        if ($footer) {
            $lines[] = '';
            array_push($lines, ...$footer);
        }
    }

    private static function pushFooterLine(array &$footer, array $preferences, string $enabledKey, string $textKey): void
    {
        if (empty($preferences[$enabledKey])) {
            return;
        }

        $line = trim((string) ($preferences[$textKey] ?? ''));
        if ($line !== '' && !in_array($line, $footer, true)) {
            $footer[] = $line;
        }
    }

    private static function pushFooterLineByText(array &$footer, string $line): void
    {
        $line = trim($line);
        if ($line !== '' && !in_array($line, $footer, true)) {
            $footer[] = $line;
        }
    }

    private static function appendCustomerIntro(array &$lines, array $preferences): void
    {
        $intro = trim((string) ($preferences['customer_confirmation_intro'] ?? ''));
        if ($intro === '') {
            return;
        }

        $lines[] = $intro;
        $lines[] = '';
    }

    private static function appendCustomerFooter(array &$lines, array $preferences): void
    {
        $footer = trim((string) ($preferences['customer_confirmation_footer'] ?? ''));
        if ($footer === '') {
            return;
        }

        $lines[] = '';
        $lines[] = $footer;
    }

    private static function branchTagText(array $data, array $preferences): string
    {
        $branchId = (int) ($data['branch_id'] ?? 0);
        $branchTags = (array) ($preferences['copy_branch_tag_by_branch'] ?? []);
        if ($branchId > 0 && trim((string) ($branchTags[(string) $branchId] ?? '')) !== '') {
            return trim((string) $branchTags[(string) $branchId]);
        }

        return trim((string) ($preferences['copy_branch_tag_text'] ?? ''));
    }

    private static function isScheduledDelivery(array $data): bool
    {
        if (($data['order_type'] ?? '') !== 'delivery') {
            return false;
        }

        $time = mb_strtolower(trim((string) ($data['receive_time'] ?? '')), 'UTF-8');
        if ($time === '' || $time === 'giao ngay') {
            return false;
        }

        return !str_contains($time, 'ngay');
    }

    private static function audit(string $action, string $subjectType, int $subjectId, array $payload = []): void
    {
        $user = \current_user();
        Database::execute(
            'INSERT INTO audit_logs (user_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)',
            [$user['id'] ?? null, $action, $subjectType, $subjectId, json_encode($payload, JSON_UNESCAPED_UNICODE)]
        );
    }
}
