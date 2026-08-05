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
    if (preg_match('#^https?://#i', $path) === 1) {
        return $path;
    }

    $base = rtrim((string) config('app.base_url', ''), '/');
    $path = '/' . ltrim($path, '/');

    return $base . $path;
}

function app_version(): string
{
    return trim((string) config('app.version', 'dev')) ?: 'dev';
}

function asset_url(string $path, ?string $version = null): string
{
    $path = '/' . ltrim($path, '/');
    $version = trim((string) ($version ?? app_version())) ?: 'dev';

    $assetPath = dirname(__DIR__) . '/public' . $path;
    if (is_file($assetPath)) {
        $version .= '-' . filemtime($assetPath);
    }

    $separator = str_contains($path, '?') ? '&' : '?';
    return url($path . $separator . 'v=' . rawurlencode($version));
}

function redirect(string $path): never
{
    header('Location: ' . safe_redirect_url($path));
    exit;
}

function safe_redirect_url(string $path): string
{
    if (preg_match('#^https?://#i', $path) !== 1) {
        return url($path);
    }

    $targetHost = parse_url($path, PHP_URL_HOST);
    $appHost = parse_url((string) config('app.base_url', ''), PHP_URL_HOST);
    $requestHost = $_SERVER['HTTP_HOST'] ?? '';

    if ($targetHost && ($targetHost === $appHost || $targetHost === $requestHost)) {
        return $path;
    }

    return url('/');
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
