<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CustomerBlacklistModel;

class CustomerController extends Controller
{
    public function blacklist(): void
    {
        $filters = [
            'q' => trim((string) \input('q', '')),
        ];

        $this->view('customers/blacklist', [
            'title' => 'Blacklist',
            'filters' => $filters,
            'rows' => CustomerBlacklistModel::rows($filters),
            'stats' => CustomerBlacklistModel::stats(),
        ]);
    }
}
