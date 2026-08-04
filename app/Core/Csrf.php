<?php

namespace App\Core;

class Csrf
{
    public static function token(): string
    {
        if (empty($_SESSION['_csrf'])) {
            $_SESSION['_csrf'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['_csrf'];
    }

    public static function verify(): void
    {
        $token = $_POST['_csrf'] ?? '';
        if (!is_string($token) || !hash_equals(self::token(), $token)) {
            http_response_code(419);
            echo 'Phiên làm việc không hợp lệ. Vui lòng tải lại trang.';
            exit;
        }
    }
}
