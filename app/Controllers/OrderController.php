<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CatalogModel;
use App\Models\ContactModel;
use App\Models\CustomerBlacklistModel;
use App\Models\CustomerModel;
use App\Models\OrderDraftModel;
use App\Models\OrderModel;
use App\Models\PreferenceModel;
use App\Models\ReportModel;

class OrderController extends Controller
{
    public function create(): void
    {
        $userId = (int) \current_user()['id'];
        $preferences = PreferenceModel::resolved($userId);
        $favoriteItemIds = array_map('intval', (array) ($preferences['favorite_menu_item_ids'] ?? []));
        $recentItemIds = !empty($preferences['show_recent_menu_items_first'])
            ? OrderModel::recentMenuItemIds($userId)
            : [];
        $activeOrders = array_values(array_filter(
            OrderModel::all(),
            static fn(array $order): bool => in_array((string) ($order['workflow_status'] ?? ''), ['processing', 'sent'], true)
        ));

        $this->view('orders/create', [
            'title' => 'Tạo đơn',
            'branches' => CatalogModel::branches(),
            'categories' => CatalogModel::menuCategories(),
            'items' => $this->sortedMenuItems(CatalogModel::menuItems(), $favoriteItemIds, $recentItemIds),
            'sources' => CatalogModel::orderSources(),
            'payments' => CatalogModel::paymentMethods(),
            'orderPreferences' => $preferences,
            'quickNoticeLabels' => OrderModel::quickNoticeLabelsForPreferences($preferences),
            'favoriteItemIds' => $favoriteItemIds,
            'recentItemIds' => $recentItemIds,
            'drafts' => OrderDraftModel::forUser($userId),
            'activeOrders' => $activeOrders,
            'workflowLabels' => OrderModel::WORKFLOW_LABELS,
            'typeLabels' => OrderModel::TYPE_LABELS,
            'old' => \flash('old') ?: [],
            'errors' => \flash('errors') ?: [],
        ]);
    }

    public function store(): void
    {
        $orderType = $this->orderType((string) \input('order_type', 'delivery'));
        $submitStatus = $this->submitStatus((string) \input('submit_status', 'processing'));
        $items = $orderType === 'booking'
            ? []
            : OrderModel::prepareItems($_POST['items'] ?? [], $_POST['item_notes'] ?? []);

        $branch = $this->findById(CatalogModel::branches(), (int) \input('branch_id'));
        $source = $this->findById(CatalogModel::orderSources(), (int) \input('source_id'));
        $payment = $this->findById(CatalogModel::paymentMethods(), (int) \input('payment_method_id'));
        $errors = $this->validateOrder($items, $orderType, $payment);

        if ($errors) {
            \flash('errors', $errors);
            \flash('old', $_POST);
            \redirect('/orders/create');
        }

        $data = [
            'user_id' => \current_user()['id'],
            'branch_id' => (int) \input('branch_id'),
            'branch_name' => $branch['name'] ?? '',
            'source_id' => (int) \input('source_id'),
            'source_name' => $source['name'] ?? '',
            'payment_method_id' => $orderType === 'booking' ? 0 : (int) \input('payment_method_id'),
            'payment_name' => $payment['name'] ?? '',
            'order_type' => $orderType,
            'status_label' => '',
            'customer_name' => trim((string) \input('customer_name', '')),
            'phone' => trim((string) \input('phone', '')),
            'address' => $orderType === 'delivery' ? trim((string) \input('address', '')) : '',
            'receive_time' => trim((string) \input('receive_time', '')),
            'guest_count' => $orderType === 'booking' ? (int) \input('guest_count', 0) : null,
            'note' => $orderType === 'booking' ? trim((string) \input('note', '')) : '',
            'quick_notice_keys' => OrderModel::sanitizeQuickNoticeKeys($_POST['quick_notices'] ?? []),
        ];

        $orderId = OrderModel::create($data, $items);
        if ($submitStatus !== 'processing') {
            OrderModel::updateStatus($orderId, $submitStatus);
        }

        CustomerModel::touchFromOrder($data, $orderId);
        ContactModel::touchFromOrder($data);
        OrderDraftModel::deleteForUser((int) \input('draft_id', 0), (int) \current_user()['id']);
        PreferenceModel::rememberLastOrderChoices((int) \current_user()['id'], $data);

        if ($submitStatus === 'completed') {
            \flash('success', 'Đã hoàn thành đơn.');
            \redirect('/orders?workflow_status=completed');
        }

        if ($submitStatus === 'sent') {
            \flash('success', 'Đã copy gửi CN và chuyển đơn sang Đã gửi CN.');
            \redirect('/orders/create');
        }

        \flash('success', 'Đã lưu đơn đang xử lý.');
        \redirect('/orders/create');
    }

    public function index(): void
    {
        $filters = [
            'date_from' => \input('date_from', \today()),
            'date_to' => \input('date_to', \today()),
            'workflow_status' => \input('workflow_status', ''),
            'branch_id' => \input('branch_id', ''),
            'source_id' => \input('source_id', ''),
            'order_type' => \input('order_type', ''),
            'user_id' => \input('user_id', ''),
            'q' => trim((string) \input('q', '')),
        ];

        $this->view('orders/index', [
            'title' => 'Đơn hàng',
            'orders' => OrderModel::all($filters),
            'filters' => $filters,
            'branches' => CatalogModel::branches(),
            'sources' => CatalogModel::orderSources(),
            'users' => CatalogModel::users(true),
            'workflowLabels' => OrderModel::WORKFLOW_LABELS,
            'typeLabels' => OrderModel::TYPE_LABELS,
        ]);
    }

    public function show(int $id): void
    {
        $order = OrderModel::find($id);
        if (!$order) {
            http_response_code(404);
            echo 'Không tìm thấy đơn.';
            return;
        }
        $order = ReportModel::withEstimatedGuestMetrics([$order])[0] ?? $order;
        $customerProfile = CustomerBlacklistModel::attachToProfile(CustomerModel::lookup((string) ($order['phone'] ?? '')));

        $this->view('orders/show', [
            'title' => $order['order_code'],
            'order' => $order,
            'customerProfile' => $customerProfile,
            'orderBlacklistEntry' => CustomerBlacklistModel::orderEntry((int) $order['id']),
            'branchText' => OrderModel::generateBranchText($order, $order['items']),
            'customerText' => OrderModel::generateCustomerText($order),
            'copyPreferences' => PreferenceModel::resolved((int) \current_user()['id']),
            'workflowLabels' => OrderModel::WORKFLOW_LABELS,
            'typeLabels' => OrderModel::TYPE_LABELS,
            'adminUsers' => \is_admin() ? CatalogModel::users(true) : [],
        ]);
    }

    public function status(int $id): void
    {
        $status = (string) \input('workflow_status', '');
        OrderModel::updateStatus($id, $status);
        \flash('success', 'Đã cập nhật trạng thái đơn.');
        \redirect((string) ($_SERVER['HTTP_REFERER'] ?? '/orders'));
    }

    public function reassign(int $id): void
    {
        if (!\is_admin()) {
            http_response_code(403);
            echo 'Chỉ admin được chuyển người tạo đơn.';
            return;
        }

        $newUserId = (int) \input('user_id', 0);
        try {
            if (!OrderModel::reassignUser($id, $newUserId)) {
                \flash('error', 'Không tìm thấy đơn cần chuyển.');
            } else {
                \flash('success', 'Đã chuyển người tạo đơn.');
            }
        } catch (\Throwable $exception) {
            \flash('error', $exception->getMessage() ?: 'Không chuyển được người tạo đơn.');
        }

        \redirect('/orders/' . $id);
    }

    public function delete(int $id): void
    {
        if (!\is_admin()) {
            http_response_code(403);
            echo 'Chỉ admin được xóa đơn.';
            return;
        }

        try {
            if (!OrderModel::deleteOrder($id)) {
                \flash('error', 'Không tìm thấy đơn cần xóa.');
            } else {
                \flash('success', 'Đã xóa đơn.');
            }
        } catch (\Throwable $exception) {
            \flash('error', 'Không xóa được đơn. Vui lòng kiểm tra ràng buộc dữ liệu.');
            \redirect('/orders/' . $id);
        }

        \redirect('/orders');
    }

    public function blacklistOrder(int $id): void
    {
        $order = OrderModel::find($id);
        if (!$order) {
            \flash('error', 'Không tìm thấy đơn để cập nhật blacklist.');
            \redirect('/orders');
        }

        $blacklisted = (int) \input('is_blacklisted', 1) === 1;
        $reason = trim((string) \input('reason', ''));

        try {
            CustomerBlacklistModel::setForOrder($order, $blacklisted, $reason, (int) \current_user()['id']);
            \flash('success', $blacklisted ? 'Đã ghi nhận đơn này vào blacklist.' : 'Đã gỡ đơn này khỏi blacklist.');
        } catch (\Throwable $exception) {
            \flash('error', 'Không cập nhật được blacklist. Hãy kiểm tra migration blacklist_entries đã import chưa.');
        }

        \redirect('/orders/' . $id);
    }

    public function customerLookup(): void
    {
        $phone = trim((string) \input('phone', ''));
        try {
            $this->json(CustomerBlacklistModel::attachToProfile(CustomerModel::lookup($phone)));
        } catch (\Throwable $exception) {
            $this->json(['message' => 'Không tra cứu được lịch sử khách hàng.'], 500);
        }
    }

    public function customerBlacklist(): void
    {
        $this->json(['message' => 'Blacklist cần gắn theo từng đơn hàng. Vào chi tiết đơn bị hủy/boom để thêm blacklist.'], 422);
    }

    public function markSentAfterCopy(int $id): void
    {
        $order = OrderModel::find($id);
        if (!$order) {
            $this->json(['changed' => false, 'message' => 'Không tìm thấy đơn.'], 404);
        }

        if (($order['workflow_status'] ?? '') !== 'processing') {
            $this->json([
                'changed' => false,
                'status' => $order['workflow_status'],
                'label' => OrderModel::workflowLabel((string) $order['workflow_status']),
            ]);
        }

        OrderModel::updateStatus($id, 'sent');
        $this->json(['changed' => true, 'status' => 'sent', 'label' => OrderModel::workflowLabel('sent')]);
    }

    public function drafts(): void
    {
        $this->json(['drafts' => OrderDraftModel::forUser((int) \current_user()['id'])]);
    }

    public function saveDraft(): void
    {
        $payloadJson = (string) \input('payload_json', '{}');
        $payload = json_decode($payloadJson, true);
        if (!is_array($payload)) {
            $this->json(['message' => 'Dữ liệu nháp không hợp lệ.'], 422);
        }

        $draft = OrderDraftModel::save(
            (int) \current_user()['id'],
            (int) \input('draft_id', 0),
            $payload
        );

        $this->json(['draft' => $draft, 'drafts' => OrderDraftModel::forUser((int) \current_user()['id'])]);
    }

    public function deleteDraft(int $id): void
    {
        OrderDraftModel::deleteForUser($id, (int) \current_user()['id']);
        $this->json(['deleted' => true, 'drafts' => OrderDraftModel::forUser((int) \current_user()['id'])]);
    }

    private function validateOrder(array $items, string $orderType, ?array $payment): array
    {
        $errors = [];
        if (trim((string) \input('customer_name', '')) === '') {
            $errors[] = 'Tên khách là bắt buộc.';
        }
        if (trim((string) \input('phone', '')) === '') {
            $errors[] = 'Số điện thoại là bắt buộc.';
        }
        if ((int) \input('branch_id') <= 0) {
            $errors[] = 'Vui lòng chọn chi nhánh.';
        }
        if ((int) \input('source_id') <= 0) {
            $errors[] = 'Vui lòng chọn nguồn đơn.';
        }
        if ($orderType !== 'booking' && (int) \input('payment_method_id') <= 0) {
            $errors[] = 'Vui lòng chọn hình thức thanh toán.';
        }
        if ($orderType !== 'booking' && $payment && !in_array($payment['name'], $this->allowedPayments($orderType), true)) {
            $errors[] = 'Hình thức thanh toán không đúng với loại đơn.';
        }
        if ($orderType !== 'booking' && !$items) {
            $errors[] = 'Vui lòng chọn ít nhất một món.';
        }
        if ($orderType === 'booking' && (int) \input('guest_count', 0) <= 0) {
            $errors[] = 'Vui lòng nhập số lượng khách đặt bàn.';
        }
        if ($orderType === 'booking' && trim((string) \input('receive_time', '')) === '') {
            $errors[] = 'Vui lòng nhập thời gian đặt bàn.';
        }

        return $errors;
    }

    private function orderType(string $type): string
    {
        return array_key_exists($type, OrderModel::TYPE_LABELS) ? $type : 'delivery';
    }

    private function submitStatus(string $status): string
    {
        return in_array($status, ['processing', 'sent', 'completed'], true) ? $status : 'processing';
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

    private function allowedPayments(string $orderType): array
    {
        return match ($orderType) {
            'delivery' => ['COD', 'Chuyển khoản'],
            'pickup' => ['Thanh toán khi ghé lấy', 'Đã thanh toán trước'],
            default => [],
        };
    }

    private function sortedMenuItems(array $items, array $favoriteItemIds, array $recentItemIds): array
    {
        $favoriteRank = array_flip(array_values(array_unique(array_map('intval', $favoriteItemIds))));
        $recentRank = array_flip(array_values(array_unique(array_map('intval', $recentItemIds))));

        foreach ($items as $index => &$item) {
            $item['_original_index'] = $index;
        }
        unset($item);

        usort($items, static function (array $a, array $b) use ($favoriteRank, $recentRank): int {
            $aId = (int) $a['id'];
            $bId = (int) $b['id'];
            $aFavorite = array_key_exists($aId, $favoriteRank);
            $bFavorite = array_key_exists($bId, $favoriteRank);
            if ($aFavorite !== $bFavorite) {
                return $aFavorite ? -1 : 1;
            }
            if ($aFavorite && $bFavorite) {
                return $favoriteRank[$aId] <=> $favoriteRank[$bId];
            }

            $aRecent = array_key_exists($aId, $recentRank);
            $bRecent = array_key_exists($bId, $recentRank);
            if ($aRecent !== $bRecent) {
                return $aRecent ? -1 : 1;
            }
            if ($aRecent && $bRecent) {
                return $recentRank[$aId] <=> $recentRank[$bId];
            }

            return ((int) ($a['_original_index'] ?? 0)) <=> ((int) ($b['_original_index'] ?? 0));
        });

        return $items;
    }
}
