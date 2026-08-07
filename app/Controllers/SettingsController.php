<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Models\CatalogModel;
use App\Models\ContactModel;
use App\Models\OrderModel;
use App\Models\PreferenceModel;

class SettingsController extends Controller
{
    private const SECTIONS = [
        'system' => ['label' => 'Cài đặt hệ thống', 'url' => '/settings/system', 'description' => 'Mẫu copy, tạo đơn nhanh, mặc định hệ thống, báo cáo.'],
        'users' => ['label' => 'Tài khoản nhân viên', 'url' => '/settings/users', 'description' => 'Thêm/sửa tài khoản, quyền admin/staff, mật khẩu.'],
        'branches' => ['label' => 'Chi nhánh', 'url' => '/settings/branches', 'description' => 'Tên chi nhánh, địa chỉ, số điện thoại, thứ tự hiển thị.'],
        'catalogs' => ['label' => 'Danh mục chung', 'url' => '/settings/catalogs', 'description' => 'Danh mục món, nguồn đơn, thanh toán, trạng thái.'],
        'menu' => ['label' => 'Món ăn', 'url' => '/settings/menu', 'description' => 'Tên món, tên gửi CN/KH, giá, định lượng khách lẩu.'],
        'messages' => ['label' => 'Tin nhắn mẫu', 'url' => '/settings/messages', 'description' => 'Mẫu tin nhắn dùng để copy nhanh khi chăm khách.'],
    ];

    public function index(): void
    {
        Auth::requireAdmin();

        $this->view('settings/home', [
            'title' => 'Cài đặt',
            'settingSections' => self::SECTIONS,
            'activeSection' => '',
        ]);
    }

    public function all(): void
    {
        Auth::requireAdmin();
        $this->view('settings/index', $this->settingsData('Cài đặt đầy đủ'));
    }

    public function system(): void
    {
        Auth::requireAdmin();
        $this->view('settings/system', $this->settingsData('Cài đặt hệ thống', 'system'));
    }

    public function users(): void
    {
        Auth::requireAdmin();
        $this->view('settings/users', $this->settingsData('Tài khoản nhân viên', 'users'));
    }

    public function branches(): void
    {
        Auth::requireAdmin();
        $this->view('settings/branches', $this->settingsData('Chi nhánh', 'branches'));
    }

    public function catalogs(): void
    {
        Auth::requireAdmin();
        $this->view('settings/catalogs', $this->settingsData('Danh mục chung', 'catalogs'));
    }

    public function menu(): void
    {
        Auth::requireAdmin();
        $this->view('settings/menu', $this->settingsData('Món ăn', 'menu'));
    }

    public function messages(): void
    {
        Auth::requireAdmin();
        $this->view('settings/messages', $this->settingsData('Tin nhắn mẫu', 'messages'));
    }

    public function saveCatalog(): void
    {
        Auth::requireAdmin();

        $catalog = (string) \input('catalog', '');
        if ($catalog === 'branches') {
            CatalogModel::saveBranch($_POST);
        } elseif ($catalog === 'menu_items') {
            CatalogModel::saveMenuItem($_POST);
        } elseif ($catalog === 'message_templates') {
            CatalogModel::saveMessageTemplate($_POST);
        } else {
            $table = match ($catalog) {
                'menu_categories' => 'menu_categories',
                'order_sources' => 'order_sources',
                'payment_methods' => 'payment_methods',
                'order_statuses' => 'order_statuses',
                default => '',
            };
            if ($table === '') {
                throw new \InvalidArgumentException('Danh mục không hợp lệ.');
            }
            CatalogModel::saveSimple($table, $_POST);
        }

        $this->savedResponse('Đã tự lưu cài đặt.');
    }

    public function saveSystemPreferences(): void
    {
        Auth::requireAdmin();

        PreferenceModel::saveSystem($_POST);
        $this->savedResponse('Đã tự lưu cài đặt hệ thống.');
    }

    public function saveUser(): void
    {
        Auth::requireAdmin();

        if (empty($_POST['id']) && empty($_POST['password'])) {
            if ($this->wantsJson()) {
                $this->json(['success' => false, 'message' => 'Tài khoản mới cần mật khẩu.'], 422);
            }

            \flash('error', 'Tài khoản mới cần mật khẩu.');
            \redirect('/settings/users');
        }

        CatalogModel::saveUser($_POST);
        $this->savedResponse('Đã tự lưu tài khoản.');
    }

    private function settingsData(string $title, string $activeSection = ''): array
    {
        return [
            'title' => $title,
            'activeSection' => $activeSection,
            'settingSections' => self::SECTIONS,
            'users' => CatalogModel::users(),
            'branches' => CatalogModel::branches(false),
            'categories' => CatalogModel::menuCategories(false),
            'items' => CatalogModel::menuItems(false),
            'sources' => CatalogModel::orderSources(false),
            'payments' => CatalogModel::paymentMethods(false),
            'statuses' => CatalogModel::orderStatuses(false),
            'messageCategories' => CatalogModel::messageCategories(),
            'messageTemplates' => CatalogModel::messageTemplates(false),
            'systemPreferences' => PreferenceModel::systemForm(),
            'channels' => ContactModel::CHANNELS,
            'typeLabels' => OrderModel::TYPE_LABELS,
            'reportRanges' => PreferenceModel::REPORT_RANGES,
        ];
    }

    private function savedResponse(string $message): void
    {
        if ($this->wantsJson()) {
            $this->json(['success' => true, 'message' => $message]);
        }

        \flash('success', $message);
        \redirect($this->safeSettingsRedirect());
    }

    private function safeSettingsRedirect(): string
    {
        $referer = (string) ($_SERVER['HTTP_REFERER'] ?? '');
        $path = parse_url($referer, PHP_URL_PATH) ?: '';
        if (str_starts_with($path, '/settings')) {
            return $path;
        }

        return '/settings';
    }

    private function wantsJson(): bool
    {
        $requestedWith = strtolower((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''));
        $accept = strtolower((string) ($_SERVER['HTTP_ACCEPT'] ?? ''));

        return $requestedWith === 'xmlhttprequest' || str_contains($accept, 'application/json');
    }
}
