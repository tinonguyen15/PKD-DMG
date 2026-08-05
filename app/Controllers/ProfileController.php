<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CatalogModel;
use App\Models\ContactModel;
use App\Models\OrderModel;
use App\Models\PersonalMenuModel;
use App\Models\PreferenceModel;

class ProfileController extends Controller
{
    public function settings(): void
    {
        $targetUser = $this->targetUser();

        $this->view('profile/settings', [
            'title' => 'Cài đặt cá nhân',
            'targetUser' => $targetUser,
            'users' => \is_admin() ? CatalogModel::users() : [],
            'preferences' => PreferenceModel::userForm((int) $targetUser['id']),
            'personalMenu' => PersonalMenuModel::settings((int) $targetUser['id']),
            'branches' => CatalogModel::branches(),
            'sources' => CatalogModel::orderSources(),
            'payments' => CatalogModel::paymentMethods(),
            'items' => CatalogModel::menuItems(),
            'channels' => ContactModel::CHANNELS,
            'typeLabels' => OrderModel::TYPE_LABELS,
            'reportRanges' => PreferenceModel::REPORT_RANGES,
        ]);
    }

    public function saveSettings(): void
    {
        $targetUser = $this->targetUser((int) \input('target_user_id', 0));
        PreferenceModel::saveUser((int) $targetUser['id'], $_POST);
        PersonalMenuModel::saveUser((int) $targetUser['id'], $_POST);

        \flash('success', 'Đã lưu cài đặt cá nhân.');
        $suffix = \is_admin() ? '?user_id=' . (int) $targetUser['id'] : '';
        \redirect('/profile/settings' . $suffix);
    }

    private function targetUser(int $postedUserId = 0): array
    {
        $current = \current_user();
        $targetId = $postedUserId > 0 ? $postedUserId : (int) \input('user_id', $current['id'] ?? 0);
        if (!\is_admin()) {
            $targetId = (int) ($current['id'] ?? 0);
        }

        foreach (CatalogModel::users() as $user) {
            if ((int) $user['id'] === $targetId) {
                return $user;
            }
        }

        return $current ?: ['id' => 0, 'employee_code' => '', 'name' => '', 'role' => 'staff'];
    }
}
