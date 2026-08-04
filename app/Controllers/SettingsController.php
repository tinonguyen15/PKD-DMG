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
    public function index(): void
    {
        Auth::requireAdmin();

        $this->view('settings/index', [
            'title' => 'Cài đặt',
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
        ]);
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

        \flash('success', 'Đã lưu cài đặt.');
        \redirect('/settings');
    }

    public function saveSystemPreferences(): void
    {
        Auth::requireAdmin();

        PreferenceModel::saveSystem($_POST);
        \flash('success', 'Đã lưu cài đặt hệ thống.');
        \redirect('/settings');
    }

    public function saveUser(): void
    {
        Auth::requireAdmin();

        if (empty($_POST['id']) && empty($_POST['password'])) {
            \flash('error', 'Tài khoản mới cần mật khẩu.');
            \redirect('/settings');
        }

        CatalogModel::saveUser($_POST);
        \flash('success', 'Đã lưu tài khoản.');
        \redirect('/settings');
    }
}
