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
            'title' => 'Tiếp nhận',
            'filters' => $filters,
            'rows' => ContactModel::all($filters),
            'branches' => CatalogModel::branches(),
            'users' => CatalogModel::users(true),
            'channels' => ContactModel::CHANNELS,
            'old' => \flash('old') ?: [
                'report_date' => \today(),
                'branch_id' => $preferences['default_contact_branch_id'] ?? 0,
                'channel' => $preferences['default_contact_channel'] ?? 'zalo_oa',
            ],
            'errors' => \flash('errors') ?: [],
        ]);
    }

    public function store(): void
    {
        if ((int) \input('id', 0) > 0) {
            ContactModel::saveReceivedCount(
                (int) \input('id'),
                (int) \input('received_count', 0)
            );
            $this->savedResponse('Đã tự lưu tiếp nhận.');
        }

        $data = [
            'report_date' => (string) \input('report_date', \today()),
            'user_id' => (int) \current_user()['id'],
            'branch_id' => (int) \input('branch_id'),
            'channel' => (string) \input('channel', ''),
        ];

        $errors = [];
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['report_date'])) {
            $errors[] = 'Ngày tiếp nhận không hợp lệ.';
        }
        if ($data['branch_id'] <= 0) {
            $errors[] = 'Vui lòng chọn chi nhánh.';
        }
        if (!isset(ContactModel::CHANNELS[$data['channel']])) {
            $errors[] = 'Kênh tiếp nhận không hợp lệ.';
        }

        if ($errors) {
            $this->errorResponse($errors, $_POST);
        }

        ContactModel::ensureRow($data);
        $this->savedResponse('Đã thêm dòng tiếp nhận.');
    }

    private function savedResponse(string $message): void
    {
        if ($this->wantsJson()) {
            $this->json(['success' => true, 'message' => $message]);
        }

        \flash('success', $message);
        \redirect('/contacts?date_from=' . urlencode((string) \input('report_date', \today())) . '&date_to=' . urlencode((string) \input('report_date', \today())));
    }

    private function errorResponse(array $errors, array $old): void
    {
        if ($this->wantsJson()) {
            $this->json(['success' => false, 'message' => implode(' ', $errors), 'errors' => $errors], 422);
        }

        \flash('errors', $errors);
        \flash('old', $old);
        \redirect('/contacts');
    }

    private function wantsJson(): bool
    {
        $requestedWith = strtolower((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''));
        $accept = strtolower((string) ($_SERVER['HTTP_ACCEPT'] ?? ''));

        return $requestedWith === 'xmlhttprequest' || str_contains($accept, 'application/json');
    }
}
