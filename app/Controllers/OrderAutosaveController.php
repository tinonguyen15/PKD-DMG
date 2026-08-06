<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CatalogModel;
use App\Models\ContactModel;
use App\Models\CustomerModel;
use App\Models\OrderEditModel;
use App\Models\OrderModel;
use App\Models\PreferenceModel;

class OrderAutosaveController extends Controller
{
    public function autosave(int $id): void
    {
        $order = OrderModel::find($id);
        if (!$order) {
            $this->json(['saved' => false, 'message' => 'Không tìm thấy đơn cần tự lưu.'], 404);
        }

        if (($order['workflow_status'] ?? '') !== 'processing') {
            $this->json([
                'saved' => false,
                'message' => 'Đơn không còn ở trạng thái Đang xử lý nên không thể tự lưu.',
                'status' => $order['workflow_status'] ?? '',
                'label' => OrderModel::workflowLabel((string) ($order['workflow_status'] ?? '')),
            ], 409);
        }

        $orderType = $this->orderType((string) \input('order_type', $order['order_type'] ?? 'delivery'));
        $items = $orderType === 'booking'
            ? []
            : OrderModel::prepareItems($_POST['items'] ?? [], $_POST['item_notes'] ?? []);

        $branch = $this->findById(CatalogModel::branches(), (int) \input('branch_id', $order['branch_id'] ?? 0));
        $source = $this->findById(CatalogModel::orderSources(), (int) \input('source_id', $order['source_id'] ?? 0));
        $payment = $this->findById(CatalogModel::paymentMethods(), (int) \input('payment_method_id', $order['payment_method_id'] ?? 0));

        $data = [
            'user_id' => (int) \current_user()['id'],
            'branch_id' => (int) \input('branch_id', $order['branch_id'] ?? 0),
            'branch_name' => $branch['name'] ?? '',
            'source_id' => (int) \input('source_id', $order['source_id'] ?? 0),
            'source_name' => $source['name'] ?? '',
            'payment_method_id' => $orderType === 'booking' ? 0 : (int) \input('payment_method_id', $order['payment_method_id'] ?? 0),
            'payment_name' => $orderType === 'booking' ? '' : ($payment['name'] ?? ''),
            'order_type' => $orderType,
            'status_label' => trim((string) ($order['status_label'] ?? '')),
            'customer_name' => trim((string) \input('customer_name', $order['customer_name'] ?? '')),
            'phone' => trim((string) \input('phone', $order['phone'] ?? '')),
            'address' => $orderType === 'delivery' ? trim((string) \input('address', $order['address'] ?? '')) : '',
            'receive_time' => trim((string) \input('receive_time', $order['receive_time'] ?? '')),
            'guest_count' => $orderType === 'booking' ? (int) \input('guest_count', $order['guest_count'] ?? 0) : null,
            'note' => $orderType === 'booking' ? trim((string) \input('note', $order['note'] ?? '')) : '',
            'quick_notice_keys' => OrderModel::sanitizeQuickNoticeKeys($_POST['quick_notices'] ?? []),
        ];

        try {
            OrderEditModel::updateProcessingOrder($id, $data, $items);
            if ($data['customer_name'] !== '' || $data['phone'] !== '') {
                CustomerModel::touchFromOrder($data, $id);
                ContactModel::touchFromOrder($data);
            }
            PreferenceModel::rememberLastOrderChoices((int) \current_user()['id'], $data);

            $updated = OrderModel::find($id) ?: $order;
            $this->json([
                'saved' => true,
                'order_id' => $id,
                'order_code' => $updated['order_code'] ?? $order['order_code'] ?? '',
                'total' => (int) ($updated['total'] ?? 0),
                'generated_text' => $updated['generated_text'] ?? '',
                'saved_at' => date('H:i:s'),
                'message' => 'Đã tự lưu.',
            ]);
        } catch (\Throwable $exception) {
            $this->json([
                'saved' => false,
                'message' => $exception->getMessage() ?: 'Không tự lưu được đơn.',
            ], 422);
        }
    }

    private function orderType(string $type): string
    {
        return array_key_exists($type, OrderModel::TYPE_LABELS) ? $type : 'delivery';
    }

    private function findById(array $rows, int $id): ?array
    {
        foreach ($rows as $row) {
            if ((int) $row['id'] === $id) {
                return $row;
            }
        }

        return null;
    }
}
