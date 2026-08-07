<?php

declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Controllers\AuthController;
use App\Controllers\ContactController;
use App\Controllers\CustomerController;
use App\Controllers\DashboardController;
use App\Controllers\OrderAutosaveController;
use App\Controllers\OrderController;
use App\Controllers\OrderWorkspaceController;
use App\Controllers\ProfileController;
use App\Controllers\ReportController;
use App\Controllers\SettingsController;
use App\Core\Auth;
use App\Core\Csrf;

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rtrim($path, '/') ?: '/';
$method = request_method();

try {
    if ($method === 'POST') {
        Csrf::verify();
    }

    if ($path === '/login' && $method === 'GET') {
        (new AuthController())->showLogin();
        exit;
    }
    if ($path === '/login' && $method === 'POST') {
        (new AuthController())->login();
        exit;
    }
    if ($path === '/logout' && $method === 'POST') {
        (new AuthController())->logout();
        exit;
    }

    Auth::requireLogin();

    match (true) {
        $path === '/' => (new DashboardController())->index(),
        $path === '/profile/settings' && $method === 'GET' => (new ProfileController())->settings(),
        $path === '/profile/settings' && $method === 'POST' => (new ProfileController())->saveSettings(),
        $path === '/customers/blacklist' && $method === 'GET' => (new CustomerController())->blacklist(),
        $path === '/orders/create' && $method === 'GET' => (new OrderController())->create(),
        $path === '/orders/new-processing' && $method === 'POST' => (new OrderController())->newProcessing(),
        $path === '/orders/new-processing-json' && $method === 'POST' => (new OrderWorkspaceController())->newProcessing(),
        $path === '/orders/customer-lookup' && $method === 'GET' => (new OrderController())->customerLookup(),
        $path === '/orders/customer-blacklist' && $method === 'POST' => (new OrderController())->customerBlacklist(),
        $path === '/orders/drafts' && $method === 'GET' => (new OrderController())->drafts(),
        $path === '/orders/drafts' && $method === 'POST' => (new OrderController())->saveDraft(),
        preg_match('#^/orders/drafts/(\d+)/delete$#', $path, $m) && $method === 'POST' => (new OrderController())->deleteDraft((int) $m[1]),
        $path === '/orders' && $method === 'GET' => (new OrderController())->index(),
        $path === '/orders' && $method === 'POST' => (new OrderController())->store(),
        preg_match('#^/orders/(\d+)$#', $path, $m) && $method === 'GET' => (new OrderController())->show((int) $m[1]),
        preg_match('#^/orders/(\d+)/edit-data$#', $path, $m) && $method === 'GET' => (new OrderWorkspaceController())->editData((int) $m[1]),
        preg_match('#^/orders/(\d+)/autosave$#', $path, $m) && $method === 'POST' => (new OrderAutosaveController())->autosave((int) $m[1]),
        preg_match('#^/orders/(\d+)/reopen-edit$#', $path, $m) && $method === 'POST' => (new OrderController())->reopenForEdit((int) $m[1]),
        preg_match('#^/orders/(\d+)/reopen-edit-json$#', $path, $m) && $method === 'POST' => (new OrderWorkspaceController())->reopenEdit((int) $m[1]),
        preg_match('#^/orders/(\d+)/status$#', $path, $m) && $method === 'POST' => (new OrderController())->status((int) $m[1]),
        preg_match('#^/orders/(\d+)/reassign$#', $path, $m) && $method === 'POST' => (new OrderController())->reassign((int) $m[1]),
        preg_match('#^/orders/(\d+)/delete-processing$#', $path, $m) && $method === 'POST' => (new OrderController())->deleteProcessing((int) $m[1]),
        preg_match('#^/orders/(\d+)/delete$#', $path, $m) && $method === 'POST' => (new OrderController())->delete((int) $m[1]),
        preg_match('#^/orders/(\d+)/blacklist$#', $path, $m) && $method === 'POST' => (new OrderController())->blacklistOrder((int) $m[1]),
        preg_match('#^/orders/(\d+)/copy-sent$#', $path, $m) && $method === 'POST' => (new OrderController())->markSentAfterCopy((int) $m[1]),
        $path === '/contacts' && $method === 'GET' => (new ContactController())->index(),
        $path === '/contacts' && $method === 'POST' => (new ContactController())->store(),
        $path === '/reports/export' && $method === 'GET' => (new ReportController())->export(),
        $path === '/reports' => (new ReportController())->index(),
        $path === '/settings' && $method === 'GET' => (new SettingsController())->index(),
        $path === '/settings/all' && $method === 'GET' => (new SettingsController())->all(),
        $path === '/settings/system' && $method === 'GET' => (new SettingsController())->system(),
        $path === '/settings/users' && $method === 'GET' => (new SettingsController())->users(),
        $path === '/settings/branches' && $method === 'GET' => (new SettingsController())->branches(),
        $path === '/settings/catalogs' && $method === 'GET' => (new SettingsController())->catalogs(),
        $path === '/settings/menu' && $method === 'GET' => (new SettingsController())->menu(),
        $path === '/settings/messages' && $method === 'GET' => (new SettingsController())->messages(),
        $path === '/settings/catalog' && $method === 'POST' => (new SettingsController())->saveCatalog(),
        $path === '/settings/users' && $method === 'POST' => (new SettingsController())->saveUser(),
        $path === '/settings/system-preferences' && $method === 'POST' => (new SettingsController())->saveSystemPreferences(),
        default => (function () {
            http_response_code(404);
            echo 'Không tìm thấy trang.';
        })(),
    };
} catch (Throwable $exception) {
    http_response_code(500);
    $message = getenv('APP_DEBUG') ? $exception->getMessage() : 'Có lỗi hệ thống. Vui lòng thử lại.';
    echo '<h1>Lỗi</h1><p>' . e($message) . '</p>';
}