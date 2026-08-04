<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;

class AuthController extends Controller
{
    public function showLogin(): void
    {
        if (Auth::user()) {
            \redirect('/');
        }

        $this->view('auth/login', ['title' => 'Đăng nhập'], 'auth_layout');
    }

    public function login(): void
    {
        $username = trim((string) \input('username', ''));
        $password = (string) \input('password', '');

        if ($username === '' || $password === '' || !Auth::attempt($username, $password)) {
            \flash('error', 'Tài khoản hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.');
            \flash('old_username', $username);
            \redirect('/login');
        }

        \redirect('/');
    }

    public function logout(): void
    {
        Auth::logout();
        \redirect('/login');
    }
}
