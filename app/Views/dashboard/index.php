<link rel="stylesheet" href="<?= e(asset_url('/assets/css/dashboard-order-actions.css')) ?>">

<section class="metric-grid">
  <article class="metric-title"><span>Tổng đơn</span><b><?= (int) ($summary['total_orders'] ?? 0) ?></b><small>Đơn tạo hôm nay</small></article>
  <article><span>Đơn hoàn thành</span><b><?= (int) ($summary['completed_orders'] ?? 0) ?></b></article>
  <article><span>Đơn hủy</span><b><?= (int) ($summary['cancelled_orders'] ?? 0) ?></b></article>
  <article><span>Doanh thu</span><b><?= money((int) ($summary['completed_revenue'] ?? 0)) ?></b></article>
  <article><span>Khách ước tính</span><b><?= (int) ($summary['estimated_completed_guests'] ?? 0) ?></b></article>
  <article><span>TB DT/Đơn</span><b><?= money((int) ($summary['average_completed_order'] ?? 0)) ?></b>/ Đơn</article>
  <article><span>TB DT/Khách</span><b><?= money((int) ($summary['average_revenue_per_guest'] ?? 0)) ?></b>/ Khách</article>
  <article><span>Lượt tiếp cận</span><b><?= (int) ($contacts['received_count'] ?? 0) ?></b></article>
</section>

<section class="panel dashboard-orders-panel">
  <div class="section-head">
    <div>
      <h2>Đơn mới nhất</h2>
      <p class="muted small">Làm tiếp đơn đang xử lý, sửa lại đơn đã gửi CN và thêm blacklist nhanh.</p>
    </div>
    <a class="btn primary" href="<?= e(url('/orders/create')) ?>">Tạo đơn</a>
  </div>
  <div class="table-wrap">
    <table class="dashboard-order-table">
      <thead>
        <tr>
          <th>Mã</th>
          <th>Tên KH</th>
          <th>Chi nhánh</th>
          <th>Trạng thái</th>
          <th>Tổng</th>
          <th>Khách</th>
          <th>TB/ Khách</th>
          <th class="dashboard-action-col">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($latestOrders as $order): ?>
          <?php
            $status = (string) ($order['workflow_status'] ?? '');
            $isProcessing = $status === 'processing';
            $isSent = $status === 'sent';
          ?>
          <tr>
            <td><a href="<?= e(url('/orders/' . $order['id'])) ?>"><?= e($order['order_code']) ?></a></td>
            <td><?= e(trim((string) ($order['customer_name'] ?? '')) ?: 'Chưa nhập tên') ?></td>
            <td><?= e($order['branch_name'] ?: 'Chưa CN') ?></td>
            <td><span class="pill <?= e($order['workflow_status']) ?>"><?= e($workflowLabels[$order['workflow_status']] ?? $order['workflow_status']) ?></span></td>
            <td><?= money((int) $order['total']) ?></td>
            <td><?= (int) ($order['estimated_guests'] ?? 0) ?: '-' ?></td>
            <td><?= money((int) ($order['average_revenue_per_guest'] ?? 0)) ?></td>
            <td>
              <div class="dashboard-order-actions">
                <?php if ($isProcessing): ?>
                  <a class="dash-action-btn is-edit" href="<?= e(url('/orders/create?edit_order_id=' . (int) $order['id'])) ?>">Làm tiếp</a>
                <?php elseif ($isSent): ?>
                  <form method="post" action="<?= e(url('/orders/' . (int) $order['id'] . '/reopen-edit')) ?>" data-dashboard-reopen-form data-order-code="<?= e($order['order_code']) ?>">
                    <?= csrf_field() ?>
                    <button class="dash-action-btn is-edit" type="submit">✎ Sửa lại</button>
                  </form>
                <?php else: ?>
                  <button class="dash-action-btn is-disabled" type="button" disabled>Không sửa</button>
                <?php endif; ?>

                <form method="post" action="<?= e(url('/orders/' . (int) $order['id'] . '/blacklist')) ?>" data-dashboard-blacklist-form data-order-code="<?= e($order['order_code']) ?>">
                  <?= csrf_field() ?>
                  <input type="hidden" name="is_blacklisted" value="1">
                  <input type="hidden" name="reason" value="" data-dashboard-blacklist-reason>
                  <button class="dash-action-btn is-blacklist" type="submit">Blacklist</button>
                </form>

                <?php if (is_admin()): ?>
                  <form method="post" action="<?= e(url('/orders/' . (int) $order['id'] . '/delete')) ?>" data-dashboard-delete-form data-order-code="<?= e($order['order_code']) ?>">
                    <?= csrf_field() ?>
                    <button class="dash-action-btn is-delete" type="submit">Xóa</button>
                  </form>
                <?php endif; ?>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if (!$latestOrders): ?>
          <tr><td colspan="8" class="empty">Chưa có đơn hôm nay.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</section>

<script src="<?= e(asset_url('/assets/js/dashboard-order-actions.js')) ?>"></script>