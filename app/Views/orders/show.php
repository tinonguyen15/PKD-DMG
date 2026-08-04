<section class="content-grid two">
  <article class="panel">
    <div class="section-head">
      <h2><?= e($order['order_code']) ?></h2>
      <span class="pill <?= e($order['workflow_status']) ?>" data-order-status-pill><?= e($workflowLabels[$order['workflow_status']] ?? $order['workflow_status']) ?></span>
    </div>
    <dl class="detail-grid">
      <div><dt>Khách</dt><dd><?= e($order['customer_name']) ?></dd></div>
      <div><dt>SĐT</dt><dd><?= e($order['phone']) ?></dd></div>
      <div><dt>Chi nhánh</dt><dd><?= e($order['branch_name'] ?: 'Chưa CN') ?></dd></div>
      <div><dt>Nguồn</dt><dd><?= e($order['source_name'] ?: 'Chưa nguồn') ?></dd></div>
      <div><dt>Loại đơn</dt><dd><?= e($typeLabels[$order['order_type']] ?? $order['order_type']) ?></dd></div>
      <?php if ($order['order_type'] !== 'booking'): ?>
        <div><dt>Thanh toán</dt><dd><?= e($order['payment_name'] ?: 'Chưa chọn') ?></dd></div>
      <?php endif; ?>
      <div><dt>Thời gian</dt><dd><?= e($order['receive_time'] ?: 'Chưa nhập') ?></dd></div>
      <div><dt>Khách ước tính</dt><dd><?= (int) ($order['estimated_guests'] ?? 0) ?: '-' ?></dd></div>
      <div><dt>TB/khách chốt</dt><dd><?= (int) ($order['average_revenue_per_guest'] ?? 0) > 0 ? money((int) $order['average_revenue_per_guest']) : '-' ?></dd></div>
      <?php if ($order['order_type'] === 'booking'): ?>
        <div><dt>Số lượng</dt><dd><?= (int) $order['guest_count'] ?> khách</dd></div>
        <div class="wide"><dt>Ghi chú đặt bàn</dt><dd><?= e($order['note'] ?: 'Không có') ?></dd></div>
      <?php elseif ($order['order_type'] === 'delivery'): ?>
        <div class="wide"><dt>Địa chỉ</dt><dd><?= e($order['address'] ?: 'Chưa nhập') ?></dd></div>
      <?php endif; ?>
    </dl>
    <form class="status-actions" method="post" action="<?= e(url('/orders/' . $order['id'] . '/status')) ?>">
      <?= csrf_field() ?>
      <?php foreach ($workflowLabels as $key => $label): ?>
        <button class="btn <?= $order['workflow_status'] === $key ? 'primary' : 'ghost' ?>" name="workflow_status" value="<?= e($key) ?>" type="submit"><?= e($label) ?></button>
      <?php endforeach; ?>
    </form>
  </article>

  <article class="panel">
    <div class="section-head">
      <h2>Copy nhanh</h2>
      <button
        class="btn ghost"
        type="button"
        data-copy-target="#branch-copy"
        data-copy-sent-url="<?= e(url('/orders/' . $order['id'] . '/copy-sent')) ?>"
        data-copy-auto-sent="<?= !empty($copyPreferences['auto_mark_sent_on_branch_copy']) ? '1' : '0' ?>"
      >Copy gửi CN</button>
    </div>
    <textarea id="branch-copy" class="copy-box" readonly><?= e($branchText) ?></textarea>
    <div class="section-head tight">
      <h2>Gửi khách</h2>
      <button class="btn ghost" type="button" data-copy-target="#customer-copy">Copy gửi KH</button>
    </div>
    <textarea id="customer-copy" class="copy-box" readonly><?= e($customerText) ?></textarea>
  </article>
</section>

<section class="panel">
  <div class="section-head">
    <h2>Món trong đơn</h2>
    <strong><?= money((int) $order['total']) ?></strong>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Món</th><th>Ghi chú món</th><th>Giá</th><th>SL</th><th>Thành tiền</th></tr></thead>
      <tbody>
        <?php foreach ($order['items'] as $item): ?>
          <tr>
            <td><?= e($item['item_name']) ?></td>
            <td><?= e($item['item_note'] ?: '') ?></td>
            <td><?= money((int) $item['price']) ?></td>
            <td><?= (int) $item['quantity'] ?></td>
            <td><?= money((int) $item['line_total']) ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if (!$order['items']): ?>
          <tr><td colspan="5" class="empty">Đơn này không có món.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</section>
