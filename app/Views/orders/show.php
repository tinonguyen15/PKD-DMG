<?php
$customer = $customerProfile['customer'] ?? null;
$blacklist = $customerProfile['blacklist'] ?? ['active_count' => 0, 'events' => []];
$orderBlacklistEntry = $orderBlacklistEntry ?? null;
$isOrderBlacklisted = !empty($orderBlacklistEntry['active']);
$blacklistEvents = $blacklist['events'] ?? [];
$workflowKeys = array_keys($workflowLabels);
$currentWorkflow = (string) ($order['workflow_status'] ?? 'processing');
$currentWorkflowIndex = array_search($currentWorkflow, $workflowKeys, true);
$currentWorkflowIndex = $currentWorkflowIndex === false ? 0 : (int) $currentWorkflowIndex;
$statusProgress = count($workflowKeys) > 1 ? round(($currentWorkflowIndex / (count($workflowKeys) - 1)) * 100, 2) : 0;
$fmtDate = static function (?string $value): string {
    if (!$value) return '-';
    $time = strtotime($value);
    return $time ? date('H:i d/m/Y', $time) : $value;
};
?>

<link rel="stylesheet" href="<?= e(asset_url('/assets/css/customer-blacklist.css')) ?>">
<link rel="stylesheet" href="<?= e(asset_url('/assets/css/order-detail-actions.css')) ?>">

<section class="content-grid two">
  <article class="panel order-detail-panel">
    <div class="section-head">
      <h2><?= e($order['order_code']) ?></h2>
      <span class="pill <?= e($currentWorkflow) ?>" data-order-status-pill><?= e($workflowLabels[$currentWorkflow] ?? $currentWorkflow) ?></span>
    </div>
    <dl class="detail-grid">
      <div><dt>Khách</dt><dd><?= e($order['customer_name']) ?></dd></div>
      <div><dt>SĐT</dt><dd><?= e($order['phone']) ?></dd></div>
      <div><dt>Người tạo</dt><dd><?= e(($order['employee_code'] ?? '') . ' - ' . ($order['staff_name'] ?? '')) ?></dd></div>
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

    <div class="order-flow-block">
      <div class="order-flow-head">
        <div>
          <h3>Chuyển trạng thái</h3>
          <p>Click vào từng điểm để chuyển trạng thái đơn.</p>
        </div>
        <span class="order-flow-current <?= e($currentWorkflow) ?>"><?= e($workflowLabels[$currentWorkflow] ?? $currentWorkflow) ?></span>
      </div>
      <form
        class="order-status-timeline"
        method="post"
        action="<?= e(url('/orders/' . $order['id'] . '/status')) ?>"
        data-status-timeline
        data-current-status="<?= e($currentWorkflow) ?>"
        data-visual-status="<?= e($currentWorkflow) ?>"
        style="--status-progress: <?= e((string) $statusProgress) ?>%; --status-step-count: <?= count($workflowKeys) ?>;"
      >
        <?= csrf_field() ?>
        <div class="status-step-list">
          <?php foreach ($workflowLabels as $key => $label): ?>
            <?php
              $stepIndex = array_search($key, $workflowKeys, true);
              $stepIndex = $stepIndex === false ? 0 : (int) $stepIndex;
              $isPassed = $stepIndex <= $currentWorkflowIndex;
            ?>
            <button
              class="status-step <?= $currentWorkflow === $key ? 'is-current' : '' ?> <?= $isPassed ? 'is-passed' : '' ?>"
              name="workflow_status"
              value="<?= e($key) ?>"
              type="submit"
              data-status-step
              data-step-index="<?= $stepIndex ?>"
            >
              <span class="status-dot" aria-hidden="true"></span>
              <span class="status-label"><?= e($label) ?></span>
            </button>
          <?php endforeach; ?>
        </div>
      </form>
    </div>
  </article>

  <article class="panel">
    <div class="section-head">
      <h2>Copy nhanh</h2>
      <button
        class="btn ghost"
        type="button"
        data-copy-target="#branch-copy"
        data-copy-sent-url="<?= e(url('/orders/' . $order['id'] . '/copy-sent')) ?>"
        data-copy-auto-sent="1"
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

<?php if ($blacklistEvents): ?>
<section class="panel customer-flag-panel order-blacklist-history-panel <?= ((int) ($blacklist['active_count'] ?? 0) > 0) ? 'is-danger' : '' ?>">
  <div class="section-head">
    <div>
      <h2>Lịch sử blacklist của SĐT này</h2>
      <p class="muted small">
        SĐT này đang có <strong><?= (int) ($blacklist['active_count'] ?? 0) ?></strong> đơn blacklist. Mỗi lần blacklist phải gắn với một đơn cụ thể.
      </p>
    </div>
    <a class="btn ghost" href="<?= e(url('/customers/blacklist?q=' . rawurlencode((string) ($order['phone'] ?? '')))) ?>">Xem hồ sơ</a>
  </div>

  <details class="order-blacklist-history" <?= (int) ($blacklist['active_count'] ?? 0) > 0 ? 'open' : '' ?>>
    <summary>Danh sách sự kiện blacklist</summary>
    <div class="blacklist-event-list compact">
      <?php foreach ($blacklistEvents as $event): ?>
        <article class="blacklist-event-card <?= (int) ($event['order_id'] ?? 0) === (int) $order['id'] ? 'is-current' : '' ?>">
          <div class="blacklist-event-top">
            <div>
              <a href="<?= e(url('/orders/' . (int) $event['order_id'])) ?>"><strong><?= e($event['order_code'] ?: ('Đơn #' . (int) $event['order_id'])) ?></strong></a>
              <small><?= e($event['order_branch_name'] ?: 'Chưa CN') ?> · <?= e($event['order_source_name'] ?: 'Chưa nguồn') ?></small>
            </div>
            <b><?= money((int) ($event['order_total'] ?? 0)) ?></b>
          </div>
          <div class="blacklist-event-reason"><span>Lý do</span><strong><?= e($event['reason'] ?: 'Chưa ghi lý do') ?></strong></div>
          <div class="blacklist-event-meta"><span><?= e($fmtDate($event['added_at'] ?? null)) ?></span><span><?= e($event['added_by_name'] ?: 'Không rõ') ?></span></div>
        </article>
      <?php endforeach; ?>
    </div>
  </details>
</section>
<?php endif; ?>

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

<script src="<?= e(asset_url('/assets/js/order-status-timeline.js')) ?>"></script>