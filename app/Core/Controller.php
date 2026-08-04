<?php

namespace App\Core;

class Controller
{
    protected function view(string $view, array $data = [], string $layout = 'layout'): void
    {
        extract($data, EXTR_SKIP);

        $viewPath = dirname(__DIR__) . '/Views/' . $view . '.php';
        if (!is_file($viewPath)) {
            throw new \RuntimeException("View {$view} not found.");
        }

        ob_start();
        require $viewPath;
        $content = ob_get_clean();

        if ($layout === '') {
            echo $content;
            return;
        }

        require dirname(__DIR__) . '/Views/' . $layout . '.php';
    }

    protected function json(array $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
