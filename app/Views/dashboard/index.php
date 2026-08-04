<section class="metric-grid">
  <article class="metric-title"><span>Tổng quan</span><b><?= (int) ($summary['total_orders'] ?? 0) ?></b><small>Đơn tạo hôm nay</small></article>
  <article><span>Đơn hoàn thành</span><b><?= (int) ($summary['completed_orders'] ?? 0) ?></b></article>
  <article><span>Doanh thu chốt</span><b><?= money((int) ($summary['completed_revenue'] ?? 0)) ?></b></article>
  <article><span>Khách ước tính</span><b><?= (int) ($summary['estimated_completed_guests'] ?? 0) ?></b></article>
  <article><span>TB/khách chốt</span><b><?= money((int) ($summary['average_revenue_per_guest'] ?? 0)) ?></b></article>
  <article><span>Lượt tiếp cận</span><b><?= (int) ($contacts['received_count'] ?? 0) ?></b></article>
</section>

<section class="content-grid two">
  <article class="panel">
    <div class="section-head">
      <h2>Pipeline hôm nay</h2>
      <a class="btn ghost" href="<?= e(url('/orders')) ?>">Xem đơn</a>
    </div>
    <div class="status-row">
      <span>Đang xử lý/Gửi CN</span>
      <strong><?= (int) ($summary['pipeline_orders'] ?? 0) ?></strong>
    </div>
    <div class="status-row">
      <span>Đã hủy</span>
      <strong><?= (int) ($summary['cancelled_orders'] ?? 0) ?></strong>
    </div>
    <div class="status-row">
      <span>TB đơn hoàn thành</span>
      <strong><?= money((int) ($summary['average_completed_order'] ?? 0)) ?></strong>
    </div>
    <div class="status-row">
      <span>Khách ước tính chưa hủy</span>
      <strong><?= (int) ($summary['estimated_total_guests'] ?? 0) ?></strong>
    </div>
  </article>

  <article class="panel">
    <div class="section-head">
      <h2>Nhập cuối ngày</h2>
      <a class="btn primary" href="<?= e(url('/contacts')) ?>">Nhập tiếp cận</a>
    </div>
    <div class="status-row">
      <span>Khách đủ điều kiện</span>
      <strong><?= (int) ($contacts['qualified_count'] ?? 0) ?></strong>
    </div>
    <div class="status-row">
      <span>Đơn ghi nhận từ kênh</span>
      <strong><?= (int) ($contacts['manual_order_count'] ?? 0) ?></strong>
    </div>
  </article>
</section>

<section class="panel">
  <div class="section-head">
    <h2>Đơn mới nhất</h2>
    <a class="btn primary" href="<?= e(url('/orders/create')) ?>">Tạo đơn</a>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Mã</th>
          <th>Khách</th>
          <th>Chi nhánh</th>
          <th>Trạng thái</th>
          <th>Tổng</th>
          <th>Khách ước tính</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($latestOrders as $order): ?>
          <tr>
            <td><a href="<?= e(url('/orders/' . $order['id'])) ?>"><?= e($order['order_code']) ?></a></td>
            <td><?= e($order['customer_name']) ?></td>
            <td><?= e($order['branch_name'] ?: 'Chưa CN') ?></td>
            <td><span class="pill <?= e($order['workflow_status']) ?>"><?= e($workflowLabels[$order['workflow_status']] ?? $order['workflow_status']) ?></span></td>
            <td><?= money((int) $order['total']) ?></td>
            <td><?= (int) ($order['estimated_guests'] ?? 0) ?: '-' ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if (!$latestOrders): ?>
          <tr><td colspan="6" class="empty">Chưa có đơn hôm nay.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</section>
