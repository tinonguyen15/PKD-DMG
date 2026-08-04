<?php
function renderReportTable(string $title, array $rows, string $labelHeader = 'Nhóm'): void
{
    ?>
    <article class="panel">
      <div class="section-head"><h2><?= e($title) ?></h2></div>
      <div class="table-wrap compact-table">
        <table>
          <thead><tr><th><?= e($labelHeader) ?></th><th>Đơn</th><th>Hoàn thành</th><th>Hủy</th><th>Doanh thu chốt</th><th>Khách ƯT</th><th>TB/khách</th></tr></thead>
          <tbody>
            <?php foreach ($rows as $row): ?>
              <?php $estimatedGuests = (int) ($row['estimated_completed_guests'] ?? 0); ?>
              <tr>
                <td><?= e($row['label']) ?></td>
                <td><?= (int) $row['total_orders'] ?></td>
                <td><?= (int) $row['completed_orders'] ?></td>
                <td><?= (int) $row['cancelled_orders'] ?></td>
                <td><?= money((int) $row['completed_revenue']) ?></td>
                <td><?= $estimatedGuests ?></td>
                <td><?= $estimatedGuests > 0 ? money((int) ($row['average_revenue_per_guest'] ?? round((int) $row['completed_revenue'] / $estimatedGuests))) : '-' ?></td>
              </tr>
            <?php endforeach; ?>
            <?php if (!$rows): ?><tr><td colspan="7" class="empty">Không có dữ liệu.</td></tr><?php endif; ?>
          </tbody>
        </table>
      </div>
    </article>
    <?php
}
?>

<form class="panel filter-grid" method="get" action="<?= e(url('/reports')) ?>">
  <div class="section-head wide">
    <h2>Báo cáo</h2>
    <?php $exportQuery = http_build_query(array_filter($filters, fn($value) => $value !== '' && $value !== null)); ?>
    <a class="btn ghost" href="<?= e(url('/reports/export' . ($exportQuery ? '?' . $exportQuery : ''))) ?>">Xuất Excel</a>
  </div>
  <p class="wide muted small">Khách ước tính nội bộ: lẩu nhỏ x1, xí quách lớn x3, sườn chìa lớn x4, lẩu đặc biệt x5. TB/khách chỉ tính trên đơn đã hoàn thành.</p>
  <label>Từ ngày <input type="date" name="date_from" value="<?= e($filters['date_from'] ?? today()) ?>"></label>
  <label>Đến ngày <input type="date" name="date_to" value="<?= e($filters['date_to'] ?? today()) ?>"></label>
  <?php if (is_admin()): ?>
    <label>Nhân viên
      <select name="user_id">
        <option value="">Tất cả</option>
        <?php foreach ($users as $user): ?>
          <option value="<?= (int) $user['id'] ?>" <?= (int) ($filters['user_id'] ?? 0) === (int) $user['id'] ? 'selected' : '' ?>><?= e($user['employee_code'] . ' - ' . $user['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
  <?php endif; ?>
  <label>Chi nhánh
    <select name="branch_id">
      <option value="">Tất cả</option>
      <?php foreach ($branches as $branch): ?>
        <option value="<?= (int) $branch['id'] ?>" <?= (int) ($filters['branch_id'] ?? 0) === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
      <?php endforeach; ?>
    </select>
  </label>
  <label>Nguồn
    <select name="source_id">
      <option value="">Tất cả</option>
      <?php foreach ($sources as $source): ?>
        <option value="<?= (int) $source['id'] ?>" <?= (int) ($filters['source_id'] ?? 0) === (int) $source['id'] ? 'selected' : '' ?>><?= e($source['name']) ?></option>
      <?php endforeach; ?>
    </select>
  </label>
  <label>Loại đơn
    <select name="order_type">
      <option value="">Tất cả</option>
      <?php foreach ($typeLabels as $key => $label): ?>
        <option value="<?= e($key) ?>" <?= ($filters['order_type'] ?? '') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
      <?php endforeach; ?>
    </select>
  </label>
  <button class="btn primary" type="submit">Xem báo cáo</button>
</form>

<section class="metric-grid">
  <article><span>Số đơn tạo</span><b><?= (int) ($summary['total_orders'] ?? 0) ?></b></article>
  <article><span>Đơn hoàn thành</span><b><?= (int) ($summary['completed_orders'] ?? 0) ?></b></article>
  <article><span>Doanh thu chốt</span><b><?= money((int) ($summary['completed_revenue'] ?? 0)) ?></b></article>
  <article><span>TB/đơn chốt</span><b><?= money((int) ($summary['average_completed_order'] ?? 0)) ?></b></article>
  <article><span>Khách ƯT chốt</span><b><?= (int) ($summary['estimated_completed_guests'] ?? 0) ?></b></article>
  <article><span>TB/khách chốt</span><b><?= money((int) ($summary['average_revenue_per_guest'] ?? 0)) ?></b></article>
  <article><span>Đơn hủy</span><b><?= (int) ($summary['cancelled_orders'] ?? 0) ?></b></article>
  <article><span>Pipeline</span><b><?= (int) ($summary['pipeline_orders'] ?? 0) ?></b></article>
  <article><span>Lượt tiếp cận</span><b><?= (int) ($contacts['received_count'] ?? 0) ?></b></article>
  <article><span>Tỷ lệ chốt</span><b><?= e($summary['conversion_rate'] ?? 0) ?>%</b></article>
</section>

<section class="content-grid two">
  <?php renderReportTable('Theo nhân viên', $byStaff, 'Nhân viên'); ?>
  <?php renderReportTable('Theo chi nhánh', $byBranch, 'Chi nhánh'); ?>
  <?php renderReportTable('Theo nguồn', $bySource, 'Nguồn'); ?>
  <?php renderReportTable('Theo loại đơn', array_map(fn($row) => [...$row, 'label' => $typeLabels[$row['label']] ?? $row['label']], $byType), 'Loại'); ?>
  <?php renderReportTable('Theo thanh toán', $byPayment, 'Thanh toán'); ?>
  <?php renderReportTable('Theo khung giờ', array_map(fn($row) => [...$row, 'label' => $row['label'] . 'h'], $byHour), 'Giờ'); ?>
</section>

<section class="content-grid two">
  <article class="panel">
    <div class="section-head"><h2>Tiếp cận theo kênh</h2></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Kênh</th><th>Tiếp nhận</th><th>Đủ ĐK</th><th>Chốt</th><th>Hủy</th></tr></thead>
        <tbody>
          <?php foreach ($contactByChannel as $row): ?>
            <tr>
              <td><?= e($channels[$row['label']] ?? $row['label']) ?></td>
              <td><?= (int) $row['received_count'] ?></td>
              <td><?= (int) $row['qualified_count'] ?></td>
              <td><?= (int) $row['manual_order_count'] ?></td>
              <td><?= (int) $row['cancelled_count'] ?></td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$contactByChannel): ?><tr><td colspan="5" class="empty">Không có dữ liệu.</td></tr><?php endif; ?>
        </tbody>
      </table>
    </div>
  </article>

  <article class="panel">
    <div class="section-head"><h2>Món bán chạy</h2></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Món</th><th>Số lượng</th><th>Doanh thu chốt</th><th>Khách ƯT</th></tr></thead>
        <tbody>
          <?php foreach ($items as $row): ?>
            <tr>
              <td><?= e($row['item_name']) ?></td>
              <td><?= (int) $row['quantity'] ?></td>
              <td><?= money((int) $row['completed_revenue']) ?></td>
              <td><?= (int) ($row['estimated_completed_guests'] ?? 0) ?></td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$items): ?><tr><td colspan="4" class="empty">Không có dữ liệu.</td></tr><?php endif; ?>
        </tbody>
      </table>
    </div>
  </article>
</section>

<section class="panel">
  <div class="section-head"><h2>Chi tiết đơn</h2></div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Mã</th><th>Ngày</th><th>Nhân viên</th><th>Khách</th><th>CN</th><th>Nguồn</th><th>Loại</th><th>Tình trạng</th><th>Tổng</th><th>Khách ƯT</th><th>TB/khách</th></tr></thead>
      <tbody>
        <?php foreach ($orders as $order): ?>
          <?php $orderGuests = (int) ($order['estimated_guests'] ?? 0); ?>
          <tr>
            <td><a href="<?= e(url('/orders/' . $order['id'])) ?>"><?= e($order['order_code']) ?></a></td>
            <td><?= e(date('d/m H:i', strtotime($order['created_at']))) ?></td>
            <td><?= e($order['employee_code']) ?></td>
            <td><?= e($order['customer_name']) ?></td>
            <td><?= e($order['branch_name']) ?></td>
            <td><?= e($order['source_name']) ?></td>
            <td><?= e($typeLabels[$order['order_type']] ?? $order['order_type']) ?></td>
            <td><span class="pill <?= e($order['workflow_status']) ?>"><?= e($workflowLabels[$order['workflow_status']] ?? $order['workflow_status']) ?></span></td>
            <td><?= money((int) $order['total']) ?></td>
            <td><?= $orderGuests > 0 ? $orderGuests : '-' ?></td>
            <td><?= (int) ($order['average_revenue_per_guest'] ?? 0) > 0 ? money((int) $order['average_revenue_per_guest']) : '-' ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if (!$orders): ?><tr><td colspan="11" class="empty">Không có dữ liệu.</td></tr><?php endif; ?>
      </tbody>
    </table>
  </div>
</section>
