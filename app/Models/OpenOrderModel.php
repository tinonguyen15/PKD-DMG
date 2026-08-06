<?php

namespace App\Models;

use App\Core\Database;

class OpenOrderModel
{
    public static function activeOpenOrders(): array
    {
        $where = ["o.workflow_status IN ('processing', 'sent')"];
        $params = [];

        if (!\is_admin()) {
            $where[] = 'o.user_id = ?';
            $params[] = (int) (\current_user()['id'] ?? 0);
        }

        return Database::fetchAll(
            "SELECT o.*, u.employee_code, u.name AS staff_name, b.name AS branch_name,
                    s.name AS source_name, p.name AS payment_name
             FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN branches b ON b.id = o.branch_id
             LEFT JOIN order_sources s ON s.id = o.source_id
             LEFT JOIN payment_methods p ON p.id = o.payment_method_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY FIELD(o.workflow_status, 'processing', 'sent'), o.updated_at DESC, o.id DESC
             LIMIT 80",
            $params
        );
    }
}
