<?php

declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Controllers\InfoController;
use App\Core\Auth;

Auth::requireLogin();

$page = trim((string) ($_GET['page'] ?? 'branches'));
$custom = isset($_GET['custom']) ? (int) $_GET['custom'] : null;
$controller = new InfoController();

if ($custom !== null) {
    $controller->custom($custom);
    exit;
}

match ($page) {
    'branches' => $controller->branches(),
    'bank-accounts' => $controller->bankAccounts(),
    'menu' => $controller->menu(),
    default => $controller->branches(),
};
