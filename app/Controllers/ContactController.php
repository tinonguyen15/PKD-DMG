<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CatalogModel;
use App\Models\ContactModel;
use App\Models\PreferenceModel;

class ContactController extends Controller
{
    public function index(): void
    {
        $preferences = PreferenceModel::resolved((int) \current_user()['id']);
        $filters = [
            'date_from' => \input('date_from', \today()),
            'date_to' => \input('date_to', \today()),
            'branch_id' => \input('branch_id', ''),
            'channel' => \input('channel', ''),
            'user_id' => \input('user_id', ''),
        ];

        $this->view('contacts/index', [
            'title' => 'Tiếp cận',
            'filters' => $filters,
            'rows' => ContactModel::all($filters),
            'branches' => CatalogModel::branches(),
            'users' => CatalogModel::users(true),
            'channels' => ContactModel::CHANNELS,
            'old' => \flash('old') ?: [
                'report_date' => \today(),
                'user_id' => \current_user()['id'],
                'branch_id' => $preferences['default_contact_branch_id'] ?? 0,
                'channel' => $preferences['default_contact_channel'] ?? 'hotline_1900',
            ],
            'errors' => \flash('errors') ?: [],
        ]);
    }

    public function store(): void
    {
        $userId = \is_admin() ? (int) \input('user_id', \current_user()['id']) : (int) \current_user()['id'];
        $data = [
            'report_date' => (string) \input('report_date', \today()),
            'user_id' => $userId,
            'branch_id' => (int) \input('branch_id'),
            'channel' => (string) \input('channel', ''),
            'received_count' => (int) \input('received_count', 0),
            'qualified_count' => (int) \input('qualified_count', 0),
            'order_count' => (int) \input('order_count', 0),
            'cancelled_count' => (int) \input('cancelled_count', 0),
            'note' => (string) \input('note', ''),
        ];

        $errors = [];
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['report_date'])) {
            $errors[] = 'Ngày báo cáo không hợp lệ.';
        }
        if ($data['user_id'] <= 0) {
            $errors[] = 'Vui lòng chọn nhân viên.';
        }
        if ($data['branch_id'] <= 0) {
            $errors[] = 'Vui lòng chọn chi nhánh.';
        }
        if (!isset(ContactModel::CHANNELS[$data['channel']])) {
            $errors[] = 'Kênh tiếp cận không hợp lệ.';
        }

        if ($errors) {
            \flash('errors', $errors);
            \flash('old', $_POST);
            \redirect('/contacts');
        }

        ContactModel::upsert($data);
        \flash('success', 'Đã lưu báo cáo tiếp cận.');
        \redirect('/contacts?date_from=' . urlencode($data['report_date']) . '&date_to=' . urlencode($data['report_date']));
    }
}
