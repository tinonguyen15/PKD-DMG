<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CustomerModel;

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
            'rows' => CustomerModel::blacklistRows($filters),
            'stats' => CustomerModel::blacklistStats(),
        ]);
    }
}
