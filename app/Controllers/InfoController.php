<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CatalogModel;
use App\Models\InfoPageModel;

class InfoController extends Controller
{
    public function branches(): void
    {
        $this->view('info/branches', [
            'title' => 'Địa chỉ CN',
            'branches' => CatalogModel::branches(false),
        ]);
    }

    public function bankAccounts(): void
    {
        $this->view('info/bank_accounts', [
            'title' => 'STK CN',
            'branches' => CatalogModel::branches(false),
            'bankAccounts' => InfoPageModel::branchBankAccounts(),
        ]);
    }

    public function menu(): void
    {
        $this->view('info/menu', [
            'title' => 'Menu',
            'categories' => CatalogModel::menuCategories(false),
            'items' => CatalogModel::menuItems(false),
        ]);
    }

    public function custom(int $index): void
    {
        $tab = InfoPageModel::customTab((int) (\current_user()['id'] ?? 0), $index);
        if (!$tab) {
            http_response_code(404);
            echo 'Không tìm thấy tab thông tin cá nhân.';
            return;
        }

        $this->view('info/custom', [
            'title' => $tab['title'],
            'tab' => $tab,
        ]);
    }
}
