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
                'report_date' => $filters['date_from'] ?: \today(),
                'branch_id' => $preferences['default_contact_branch_id'] ?? 0,
                'channel' => $preferences['default_contact_channel'] ?? 'zalo_branch',
            ],
            'errors' => \flash('errors') ?: [],
        ]);
    }

    public function store(): void
    {
        $action = (string) \input('action', 'add_row');

        $data = [
            'report_date' => (string) \input('report_date', \today()),
            'user_id' => (int) \current_user()['id'],
            'branch_id' => (int) \input('branch_id'),
            'channel' => (string) \input('channel', ''),
            'received_count' => (int) \input('received_count', 0),
        ];

        $errors = $this->validateScope($data);
        if ($errors) {
            $this->errorResponse($errors, $_POST);
        }

        if ($action === 'save_received') {
            ContactModel::saveReceivedByScope($data);
            $this->savedResponse('Đã tự lưu tiếp nhận.', $data['report_date']);
        }

        ContactModel::ensureRow($data);
        $this->savedResponse('Đã thêm dòng tiếp nhận.', $data['report_date']);
    }

    private function validateScope(array $data): array
    {
        $errors = [];
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $data['report_date'])) {
            $errors[] = 'Ngày tiếp nhận không hợp lệ.';
        }
        if ((int) $data['branch_id'] <= 0) {
            $errors[] = 'Vui lòng chọn chi nhánh.';
        }
        if (!isset(ContactModel::CHANNELS[(string) $data['channel']])) {
            $errors[] = 'Kênh tiếp nhận không hợp lệ.';
        }

        return $errors;
    }

    private function savedResponse(string $message, string $reportDate): void
    {
        if ($this->wantsJson()) {
            $this->json(['success' => true, 'message' => $message]);
        }

        \flash('success', $message);
        \redirect('/contacts?date_from=' . urlencode($reportDate) . '&date_to=' . urlencode($reportDate));
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
