<?php
$filters = $filters ?? [];
$rows = $rows ?? [];
$stats = $stats ?? ['total' => 0, 'active_entries' => 0, 'last_7_days' => 0, 'last_30_days' => 0];
$fmtDate = static function (?string $value): string {
    if (!$value) return '-';
    $time = strtotime($value);
    return $time ? date('H:i d/m/Y', $time) : $value;
};
$statusLabel = static function (?string $status): string {
    return [
        'processing' => 'Đang xử lý',
        'sent' => 'Đã gửi CN',
        'completed' => 'Hoàn thành',
        'cancelled' => 'Đã hủy',
    ][$status ?? ''] ?? ($status ?: '-');
};
?>

<section class="blacklist-page blacklist-page-v2">
  <div class="blacklist-head panel">
    <div>
      <span>CRM khách hàng</span>
      <h1>Blacklist</h1>
      <p>Gom theo SĐT. Mỗi dòng bên trong là một đơn bị ghi nhận blacklist.</p>
    </div>
    <form class="blacklist-search" method="get" action="<?= e(url('/customers/blacklist')) ?>">
      <input name="q" value="<?= e($filters['q'] ?? '') ?>" placeholder="Tìm SĐT, tên, mã đơn, lý do">
      <button class="btn primary" type="submit">Tìm</button>
      <?php if (!empty($filters['q'])): ?>
        <a class="btn ghost" href="<?= e(url('/customers/blacklist')) ?>">Xóa lọc</a>
      <?php endif; ?>
    </form>
  </div>

  <div class="metric-grid blacklist-metrics">
    <article class="panel metric-card">
      <div class="metric-title"><span>SĐT cảnh báo</span><small>Đang blacklist</small></div>
      <b><?= (int) ($stats['total'] ?? 0) ?></b>
    </article>
    <article class="panel metric-card">
      <div class="metric-title"><span>Đơn blacklist</span><small>Tổng lượt đang hiệu lực</small></div>
      <b><?= (int) ($stats['active_entries'] ?? 0) ?></b>
    </article>
    <article class="panel metric-card">
      <div class="metric-title"><span>7 ngày</span><small>Mới thêm</small></div>
      <b><?= (int) ($stats['last_7_days'] ?? 0) ?></b>
    </article>
  </div>

  <section class="panel blacklist-table-panel">
    <div class="section-head">
      <h2>Danh sách blacklist</h2>
      <strong><?= count($rows) ?> SĐT</strong>
    </div>

    <div class="blacklist-card-list">
      <?php foreach ($rows as $row): ?>
        <?php $events = $row['events'] ?? []; ?>
        <details class="blacklist-customer-card" <?= count($rows) === 1 ? 'open' : '' ?>>
          <summary>
            <span class="blacklist-customer-main">
              <strong><?= e($row['name'] ?: 'Chưa có tên') ?></strong>
              <small><?= e($row['phone_display'] ?: $row['phone_normalized']) ?><?= !empty($row['address']) ? ' · ' . e($row['address']) : '' ?></small>
            </span>
            <span class="blacklist-count-pill"><?= (int) ($row['active_count'] ?? count($events)) ?> đơn</span>
            <span class="blacklist-latest-reason"><?= e($row['latest_reason'] ?: 'Chưa ghi lý do') ?></span>
          </summary>

          <div class="blacklist-event-list">
            <?php foreach ($events as $event): ?>
              <article class="blacklist-event-card">
                <div class="blacklist-event-top">
                  <div>
                    <?php if (!empty($event['order_id'])): ?>
                      <a href="<?= e(url('/orders/' . (int) $event['order_id'])) ?>"><strong><?= e($event['order_code'] ?: ('Đơn #' . (int) $event['order_id'])) ?></strong></a>
                    <?php else: ?>
                      <strong>Không gắn đơn</strong>
                    <?php endif; ?>
                    <small>
                      <?= e($statusLabel($event['order_status'] ?? '')) ?>
                      · <?= e($event['order_branch_name'] ?: 'Chưa CN') ?>
                      · <?= e($event['order_source_name'] ?: 'Chưa nguồn') ?>
                    </small>
                  </div>
                  <b><?= money((int) ($event['order_total'] ?? 0)) ?></b>
                </div>
                <div class="blacklist-event-reason">
                  <span>Lý do</span>
                  <strong><?= e($event['reason'] ?: 'Chưa ghi lý do') ?></strong>
                </div>
                <div class="blacklist-event-meta">
                  <span>Thêm: <?= e($fmtDate($event['added_at'] ?? null)) ?></span>
                  <span>Bởi: <?= e($event['added_by_name'] ?: 'Không rõ') ?><?= !empty($event['added_by_code']) ? ' · ' . e($event['added_by_code']) : '' ?></span>
                  <?php if (!empty($event['order_created_at'])): ?><span>Ngày đơn: <?= e($fmtDate($event['order_created_at'])) ?></span><?php endif; ?>
                </div>
              </article>
            <?php endforeach; ?>
          </div>
        </details>
      <?php endforeach; ?>

      <?php if (!$rows): ?>
        <div class="empty">Chưa có khách nào trong blacklist.</div>
      <?php endif; ?>
    </div>
  </section>
</section>
