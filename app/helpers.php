<?php

use App\Core\Auth;
use App\Core\Csrf;

function config(string $key, mixed $default = null): mixed
{
    static $configs = [];
    [$file, $name] = array_pad(explode('.', $key, 2), 2, null);

    if (!isset($configs[$file])) {
        $path = dirname(__DIR__) . "/config/{$file}.php";
        $configs[$file] = is_file($path) ? require $path : [];
    }

    return $name ? ($configs[$file][$name] ?? $default) : $configs[$file];
}

function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function url(string $path = ''): string
{
    $base = rtrim((string) config('app.base_url', ''), '/');
    $path = '/' . ltrim($path, '/');

    return $base . $path;
}

function redirect(string $path): never
{
    header('Location: ' . url($path));
    exit;
}

function request_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function input(string $key, mixed $default = null): mixed
{
    return $_POST[$key] ?? $_GET[$key] ?? $default;
}

function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . e(Csrf::token()) . '">';
}

function flash(?string $key = null, mixed $value = null): mixed
{
    if ($key === null) {
        $messages = $_SESSION['_flash'] ?? [];
        unset($_SESSION['_flash']);
        return $messages;
    }

    if ($value === null) {
        $message = $_SESSION['_flash'][$key] ?? null;
        unset($_SESSION['_flash'][$key]);
        return $message;
    }

    $_SESSION['_flash'][$key] = $value;
    return null;
}

function money(int|float|null $value): string
{
    return number_format((float) $value, 0, ',', '.') . 'đ';
}

function current_user(): ?array
{
    return Auth::user();
}

function is_admin(): bool
{
    return Auth::checkRole('admin');
}

function today(): string
{
    return date('Y-m-d');
}
