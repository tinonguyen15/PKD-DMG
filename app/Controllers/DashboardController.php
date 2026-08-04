<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\ContactModel;
use App\Models\OrderModel;
use App\Models\ReportModel;

class DashboardController extends Controller
{
    public function index(): void
    {
        $filters = ['date_from' => \today(), 'date_to' => \today()];
        $summary = ReportModel::orderSummary($filters);
        $contacts = ReportModel::contactSummary($filters);
        $latestOrders = ReportModel::withEstimatedGuestMetrics(array_slice(OrderModel::all($filters), 0, 8));

        $this->view('dashboard/index', [
            'title' => 'Tổng quan',
            'summary' => $summary,
            'contacts' => $contacts,
            'latestOrders' => $latestOrders,
            'workflowLabels' => OrderModel::WORKFLOW_LABELS,
            'channels' => ContactModel::CHANNELS,
        ]);
    }
}
