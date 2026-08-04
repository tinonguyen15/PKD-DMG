<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CatalogModel;
use App\Models\ContactModel;
use App\Models\OrderModel;
use App\Models\PreferenceModel;
use App\Models\ReportModel;
use App\Services\ExcelExporter;

class ReportController extends Controller
{
    public function index(): void
    {
        $filters = $this->filters();
        $data = $this->reportData($filters);

        $this->view('reports/index', [
            'title' => 'Báo cáo',
            ...$data,
            'orders' => array_slice($data['orders'], 0, 100),
            'branches' => CatalogModel::branches(),
            'sources' => CatalogModel::orderSources(),
            'users' => CatalogModel::users(true),
            'channels' => ContactModel::CHANNELS,
            'typeLabels' => OrderModel::TYPE_LABELS,
            'workflowLabels' => OrderModel::WORKFLOW_LABELS,
        ]);
    }

    public function export(): void
    {
        $filters = $this->filters();
        $data = $this->reportData($filters);
        $typeLabels = OrderModel::TYPE_LABELS;
        $workflowLabels = OrderModel::WORKFLOW_LABELS;
        $channels = ContactModel::CHANNELS;

        $filename = 'bao-cao-pkd-' . ($filters['date_from'] ?: \today()) . '-den-' . ($filters['date_to'] ?: \today()) . '.xlsx';

        ExcelExporter::download($filename, [
            ['name' => 'Tong quan', 'rows' => $this->overviewRows($filters, $data)],
            ['name' => 'Theo nhan vien', 'rows' => $this->orderGroupRows($data['byStaff'], 'Nhân viên')],
            ['name' => 'Theo chi nhanh', 'rows' => $this->orderGroupRows($data['byBranch'], 'Chi nhánh')],
            ['name' => 'Theo nguon', 'rows' => $this->orderGroupRows($data['bySource'], 'Nguồn')],
            ['name' => 'Theo loai don', 'rows' => $this->orderGroupRows($data['byType'], 'Loại đơn', fn($label) => $typeLabels[$label] ?? $label)],
            ['name' => 'Theo thanh toan', 'rows' => $this->orderGroupRows($data['byPayment'], 'Thanh toán')],
            ['name' => 'Theo khung gio', 'rows' => $this->orderGroupRows($data['byHour'], 'Khung giờ', fn($label) => $label . 'h')],
            ['name' => 'Tiep can kenh', 'rows' => $this->contactRows($data['contactByChannel'], 'Kênh', fn($label) => $channels[$label] ?? $label)],
            ['name' => 'Tiep can chi nhanh', 'rows' => $this->contactRows($data['contactByBranch'], 'Chi nhánh')],
            ['name' => 'Mon ban', 'rows' => $this->itemRows($data['items'])],
            ['name' => 'Chi tiet don', 'rows' => $this->orderRows($data['orders'], $typeLabels, $workflowLabels)],
        ]);
    }

    private function defaultDateRange(string $range): array
    {
        return match ($range) {
            '7_days' => [date('Y-m-d', strtotime('-6 days')), \today()],
            'month' => [date('Y-m-01'), \today()],
            default => [\today(), \today()],
        };
    }

    private function filters(): array
    {
        [$defaultFrom, $defaultTo] = $this->defaultDateRange(
            (string) (PreferenceModel::resolved((int) \current_user()['id'])['default_report_range'] ?? 'today')
        );

        return [
            'date_from' => \input('date_from', $defaultFrom),
            'date_to' => \input('date_to', $defaultTo),
            'branch_id' => \input('branch_id', ''),
            'source_id' => \input('source_id', ''),
            'order_type' => \input('order_type', ''),
            'user_id' => \input('user_id', ''),
        ];
    }

    private function reportData(array $filters): array
    {
        $summary = ReportModel::orderSummary($filters);
        $contacts = ReportModel::contactSummary($filters);

        $received = (int) ($contacts['received_count'] ?? 0);
        $completed = (int) ($summary['completed_orders'] ?? 0);
        $estimatedGuests = (int) ($summary['estimated_completed_guests'] ?? 0);
        $summary['conversion_rate'] = $received > 0 ? round($completed * 100 / $received, 1) : 0;
        $summary['revenue_per_contact'] = $received > 0 ? round((int) $summary['completed_revenue'] / $received) : 0;
        $summary['average_revenue_per_guest'] = $estimatedGuests > 0
            ? round((int) ($summary['completed_revenue'] ?? 0) / $estimatedGuests)
            : 0;

        return [
            'filters' => $filters,
            'summary' => $summary,
            'contacts' => $contacts,
            'byStaff' => ReportModel::groupOrders($filters, 'staff'),
            'byBranch' => ReportModel::groupOrders($filters, 'branch'),
            'bySource' => ReportModel::groupOrders($filters, 'source'),
            'byType' => ReportModel::groupOrders($filters, 'type'),
            'byPayment' => ReportModel::groupOrders($filters, 'payment'),
            'byHour' => ReportModel::groupOrders($filters, 'hour'),
            'contactByChannel' => ReportModel::groupContacts($filters, 'channel'),
            'contactByBranch' => ReportModel::groupContacts($filters, 'branch'),
            'items' => ReportModel::itemSales($filters),
            'orders' => ReportModel::detailOrders($filters),
        ];
    }

    private function overviewRows(array $filters, array $data): array
    {
        $summary = $data['summary'];
        $contacts = $data['contacts'];

        return [
            ['Chỉ số', 'Giá trị'],
            ['Từ ngày', $filters['date_from']],
            ['Đến ngày', $filters['date_to']],
            ['Số đơn tạo', (int) ($summary['total_orders'] ?? 0)],
            ['Đơn hoàn thành', (int) ($summary['completed_orders'] ?? 0)],
            ['Đơn hủy', (int) ($summary['cancelled_orders'] ?? 0)],
            ['Pipeline', (int) ($summary['pipeline_orders'] ?? 0)],
            ['Doanh thu chốt', (int) ($summary['completed_revenue'] ?? 0)],
            ['TB/đơn chốt', (int) ($summary['average_completed_order'] ?? 0)],
            ['Khách ước tính đơn chốt', (int) ($summary['estimated_completed_guests'] ?? 0)],
            ['TB/khách chốt', (int) ($summary['average_revenue_per_guest'] ?? 0)],
            ['Quy tắc khách ƯT', 'Lẩu nhỏ x1; xí quách lớn x3; sườn chìa lớn x4; lẩu đặc biệt x5'],
            ['Lượt tiếp cận', (int) ($contacts['received_count'] ?? 0)],
            ['Đủ điều kiện', (int) ($contacts['qualified_count'] ?? 0)],
            ['Chốt nhập tay', (int) ($contacts['manual_order_count'] ?? 0)],
            ['Tiếp cận hủy', (int) ($contacts['cancelled_count'] ?? 0)],
            ['Tỷ lệ chốt (%)', (float) ($summary['conversion_rate'] ?? 0)],
            ['Doanh thu/tiếp cận', (int) ($summary['revenue_per_contact'] ?? 0)],
        ];
    }

    private function orderGroupRows(array $rows, string $labelHeader, ?callable $labelMap = null): array
    {
        $output = [[$labelHeader, 'Đơn tạo', 'Hoàn thành', 'Hủy', 'Doanh thu chốt', 'Khách ƯT chốt', 'TB/khách chốt']];
        foreach ($rows as $row) {
            $label = (string) ($row['label'] ?? '');
            $estimatedGuests = (int) ($row['estimated_completed_guests'] ?? 0);
            $output[] = [
                $labelMap ? $labelMap($label) : $label,
                (int) ($row['total_orders'] ?? 0),
                (int) ($row['completed_orders'] ?? 0),
                (int) ($row['cancelled_orders'] ?? 0),
                (int) ($row['completed_revenue'] ?? 0),
                $estimatedGuests,
                $estimatedGuests > 0 ? (int) round((int) ($row['completed_revenue'] ?? 0) / $estimatedGuests) : 0,
            ];
        }

        return $output;
    }

    private function contactRows(array $rows, string $labelHeader, ?callable $labelMap = null): array
    {
        $output = [[$labelHeader, 'Tiếp nhận', 'Đủ ĐK', 'Chốt nhập tay', 'Hủy']];
        foreach ($rows as $row) {
            $label = (string) ($row['label'] ?? '');
            $output[] = [
                $labelMap ? $labelMap($label) : $label,
                (int) ($row['received_count'] ?? 0),
                (int) ($row['qualified_count'] ?? 0),
                (int) ($row['manual_order_count'] ?? 0),
                (int) ($row['cancelled_count'] ?? 0),
            ];
        }

        return $output;
    }

    private function itemRows(array $rows): array
    {
        $output = [['Món', 'Số lượng', 'Doanh thu chốt', 'Khách ƯT chốt']];
        foreach ($rows as $row) {
            $output[] = [
                (string) ($row['item_name'] ?? ''),
                (int) ($row['quantity'] ?? 0),
                (int) ($row['completed_revenue'] ?? 0),
                (int) ($row['estimated_completed_guests'] ?? 0),
            ];
        }

        return $output;
    }

    private function orderRows(array $orders, array $typeLabels, array $workflowLabels): array
    {
        $output = [['Mã đơn', 'Ngày tạo', 'Nhân viên', 'Khách', 'SĐT', 'Chi nhánh', 'Nguồn', 'Loại', 'Trạng thái', 'Thanh toán', 'Tổng tiền', 'Khách ƯT', 'TB/khách']];
        foreach ($orders as $order) {
            $output[] = [
                (string) $order['order_code'],
                date('d/m/Y H:i', strtotime((string) $order['created_at'])),
                (string) $order['employee_code'],
                (string) $order['customer_name'],
                (string) $order['phone'],
                (string) ($order['branch_name'] ?? ''),
                (string) ($order['source_name'] ?? ''),
                (string) ($typeLabels[$order['order_type']] ?? $order['order_type']),
                (string) ($workflowLabels[$order['workflow_status']] ?? $order['workflow_status']),
                (string) ($order['payment_name'] ?? ''),
                (int) $order['total'],
                (int) ($order['estimated_guests'] ?? 0),
                (int) ($order['average_revenue_per_guest'] ?? 0),
            ];
        }

        return $output;
    }
}
