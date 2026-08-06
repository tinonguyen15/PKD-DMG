<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CatalogModel;
use App\Models\OrderModel;
use App\Models\PreferenceModel;
use App\Models\ReportModel;

class OrderWorkspaceController extends Controller
{
    public function editData(int $id): void
    {
        $order = OrderModel::find($id);
        if (!$order) {
            $this->json(['message' => 'Không tìm thấy đơn.'], 404);
        }

        if (!in_array((string) ($order['workflow_status'] ?? ''), ['processing', 'sent'], true)) {
            $this->json(['message' => 'Chỉ mở nhanh đơn đang xử lý hoặc đã gửi CN.'], 422);
        }

        $this->json($this->payloadForOrder($order));
    }

    public function newProcessing(): void
    {
        $userId = (int) \current_user()['id'];
        $preferences = PreferenceModel::resolved($userId);
        $branches = CatalogModel::branches();
        $sources = CatalogModel::orderSources();
        $payments = CatalogModel::paymentMethods();

        $branchId = $this->validId((int) ($preferences['default_branch_id'] ?? 0), $branches);
        $sourceId = $this->validId((int) ($preferences['default_source_id'] ?? 0), $sources) ?: (int) ($sources[0]['id'] ?? 0);
        $paymentId = $this->defaultPaymentId($payments, (int) ($preferences['default_delivery_payment_method_id'] ?? 0));

        $branch = $this->findById($branches, $branchId);
        $source = $this->findById($sources, $sourceId);
        $payment = $this->findById($payments, $paymentId);

        $orderId = OrderModel::create([
            'user_id' => $userId,
            'branch_id' => $branchId,
            'branch_name' => $branch['name'] ?? '',
            'source_id' => $sourceId,
            'source_name' => $source['name'] ?? '',
            'payment_method_id' => $paymentId,
            'payment_name' => $payment['name'] ?? '',
            'order_type' => 'delivery',
            'status_label' => '',
            'customer_name' => '',
            'phone' => '',
            'address' => '',
            'receive_time' => '',
            'guest_count' => null,
            'note' => '',
            'quick_notice_keys' => [],
        ], []);

        $order = OrderModel::find($orderId);
        $this->json($this->payloadForOrder($order));
    }

    public function reopenEdit(int $id): void
    {
        $order = OrderModel::find($id);
        if (!$order) {
            $this->json(['message' => 'Không tìm thấy đơn cần sửa lại.'], 404);
        }

        $status = (string) ($order['workflow_status'] ?? '');
        if ($status === 'sent') {
            OrderModel::updateStatus($id, 'processing');
            $order = OrderModel::find($id);
        } elseif ($status !== 'processing') {
            $this->json(['message' => 'Chỉ sửa lại đơn đang xử lý hoặc đã gửi CN.'], 422);
        }

        $this->json($this->payloadForOrder($order));
    }

    private function payloadForOrder(?array $order): array
    {
        if (!$order) {
            return ['message' => 'Không tìm thấy đơn.'];
        }

        $order = ReportModel::withEstimatedGuestMetrics([$order])[0] ?? $order;
        $items = [];
        $itemNotes = [];
        foreach ((array) ($order['items'] ?? []) as $item) {
            $menuItemId = (int) ($item['menu_item_id'] ?? 0);
            if ($menuItemId <= 0) {
                continue;
            }
            $items[(string) $menuItemId] = (int) ($item['quantity'] ?? 0);
            $note = trim((string) ($item['item_note'] ?? ''));
            if ($note !== '') {
                $itemNotes[(string) $menuItemId] = $note;
            }
        }

        $quickNotices = $order['quick_notice_keys'] ?? [];
        if (is_string($quickNotices)) {
            $decoded = json_decode($quickNotices, true);
            $quickNotices = is_array($decoded) ? $decoded : [];
        }

        $status = (string) ($order['workflow_status'] ?? 'processing');
        $payload = [
            'edit_order_id' => (int) ($order['id'] ?? 0),
            'order_type' => (string) ($order['order_type'] ?? 'delivery'),
            'source_id' => (int) ($order['source_id'] ?? 0),
            'customer_name' => (string) ($order['customer_name'] ?? ''),
            'phone' => (string) ($order['phone'] ?? ''),
            'branch_id' => (int) ($order['branch_id'] ?? 0),
            'address' => (string) ($order['address'] ?? ''),
            'receive_time' => (string) ($order['receive_time'] ?? ''),
            'payment_method_id' => (int) ($order['payment_method_id'] ?? 0),
            'guest_count' => (int) ($order['guest_count'] ?? 0),
            'note' => (string) ($order['note'] ?? ''),
            'quick_notices' => OrderModel::sanitizeQuickNoticeKeys((array) $quickNotices),
            'items' => $items,
            'item_notes' => $itemNotes,
        ];

        return [
            'order' => [
                'id' => (int) ($order['id'] ?? 0),
                'order_code' => (string) ($order['order_code'] ?? ''),
                'workflow_status' => $status,
                'workflow_label' => OrderModel::workflowLabel($status),
                'customer_name' => (string) ($order['customer_name'] ?? ''),
                'phone' => (string) ($order['phone'] ?? ''),
                'branch_name' => (string) ($order['branch_name'] ?? ''),
                'source_name' => (string) ($order['source_name'] ?? ''),
                'total' => (int) ($order['total'] ?? 0),
                'estimated_guests' => (int) ($order['estimated_guests'] ?? 0),
                'average_revenue_per_guest' => (int) ($order['average_revenue_per_guest'] ?? 0),
                'generated_text' => OrderModel::generateBranchText($order, (array) ($order['items'] ?? [])),
                'customer_text' => OrderModel::generateCustomerText($order),
            ],
            'payload' => $payload,
        ];
    }

    private function validId(int $id, array $rows): int
    {
        foreach ($rows as $row) {
            if ((int) ($row['id'] ?? 0) === $id) {
                return $id;
            }
        }

        return 0;
    }

    private function defaultPaymentId(array $payments, int $preferred): int
    {
        foreach ($payments as $payment) {
            if ((int) ($payment['id'] ?? 0) === $preferred && ($payment['name'] ?? '') === 'Chuyển khoản') {
                return $preferred;
            }
        }
        foreach ($payments as $payment) {
            if (($payment['name'] ?? '') === 'Chuyển khoản') {
                return (int) $payment['id'];
            }
        }
        foreach ($payments as $payment) {
            if (($payment['name'] ?? '') === 'COD') {
                return (int) $payment['id'];
            }
        }

        return (int) ($payments[0]['id'] ?? 0);
    }

    private function findById(array $rows, int $id): ?array
    {
        foreach ($rows as $row) {
            if ((int) ($row['id'] ?? 0) === $id) {
                return $row;
            }
        }

        return null;
    }
}
