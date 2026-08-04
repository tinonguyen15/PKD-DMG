<?php

namespace App\Core;

class Auth
{
    public static function user(): ?array
    {
        if (empty($_SESSION['user_id'])) {
            return null;
        }

        static $user = null;
        if ($user && (int) $user['id'] === (int) $_SESSION['user_id']) {
            return $user;
        }

        $user = Database::fetch(
            'SELECT id, employee_code, username, name, role, active FROM users WHERE id = ? LIMIT 1',
            [$_SESSION['user_id']]
        );

        if (!$user || (int) $user['active'] !== 1) {
            self::logout();
            return null;
        }

        return $user;
    }

    public static function attempt(string $username, string $password): bool
    {
        $user = Database::fetch(
            'SELECT * FROM users WHERE username = ? OR employee_code = ? LIMIT 1',
            [$username, $username]
        );

        if (!$user || (int) $user['active'] !== 1 || !password_verify($password, $user['password_hash'])) {
            return false;
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['user_role'] = $user['role'];

        Database::execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [$user['id']]);

        return true;
    }

    public static function logout(): void
    {
        unset($_SESSION['user_id'], $_SESSION['user_role']);
    }

    public static function requireLogin(): void
    {
        if (!self::user()) {
            \redirect('/login');
        }
    }

    public static function requireAdmin(): void
    {
        self::requireLogin();
        if (!self::checkRole('admin')) {
            http_response_code(403);
            echo 'Bạn không có quyền truy cập trang này.';
            exit;
        }
    }

    public static function checkRole(string $role): bool
    {
        $user = self::user();

        return $user && $user['role'] === $role;
    }
}
