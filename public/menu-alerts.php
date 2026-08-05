<?php

declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\Auth;
use App\Core\Csrf;
use App\Models\MenuAlertModel;

header('Content-Type: application/json; charset=utf-8');

try {
    Auth::requireLogin();

    if (request_method() === 'GET') {
        echo json_encode([
            'ok' => true,
            'alerts' => MenuAlertModel::activeAlerts(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (request_method() !== 'POST') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'message' => 'Method không hợp lệ.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    Csrf::verify();

    $user = current_user() ?: [];
    MenuAlertModel::setAlert(
        (int) input('branch_id', 0),
        (int) input('menu_item_id', 0),
        (string) input('status', 'clear'),
        (int) input('minutes', 0),
        (string) input('note', ''),
        (int) ($user['id'] ?? 0)
    );

    echo json_encode([
        'ok' => true,
        'message' => 'Đã cập nhật cảnh báo món.',
        'alerts' => MenuAlertModel::activeAlerts(),
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => getenv('APP_DEBUG') ? $exception->getMessage() : 'Không cập nhật được cảnh báo món.',
    ], JSON_UNESCAPED_UNICODE);
}
