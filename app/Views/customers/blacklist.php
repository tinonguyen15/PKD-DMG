<?php
$filters = $filters ?? [];
$rows = $rows ?? [];
$stats = $stats ?? ['total' => 0, 'last_7_days' => 0, 'last_30_days' => 0];
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

<section class="blacklist-page">
  <div class="blacklist-head panel">
    <div>
      <span>CRM khách hàng</span>
      <h1>Blacklist</h1>
      <p>Danh sách SĐT cần kiểm tra kỹ trước khi nhận đơn.</p>
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
      <div class="metric-title"><span>Đang blacklist</span><small>Tổng số khách</small></div>
      <b><?= (int) $stats['total'] ?></b>
    </article>
    <article class="panel metric-card">
      <div class="metric-title"><span>7 ngày</span><small>Mới thêm</small></div>
      <b><?= (int) $stats['last_7_days'] ?></b>
    </article>
    <article class="panel metric-card">
      <div class="metric-title"><span>30 ngày</span><small>Mới thêm</small></div>
      <b><?= (int) $stats['last_30_days'] ?></b>
    </article>
  </div>

  <section class="panel blacklist-table-panel">
    <div class="section-head">
      <h2>Danh sách khách blacklist</h2>
      <strong><?= count($rows) ?> khách</strong>
    </div>

    <div class="table-wrap">
      <table class="blacklist-table">
        <thead>
          <tr>
            <th>Khách</th>
            <th>Lý do</th>
            <th>Đơn liên quan</th>
            <th>Người thêm</th>
            <th>Ngày thêm</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($rows as $row): ?>
            <tr>
              <td>
                <strong><?= e($row['name'] ?: $row['order_customer_name'] ?: 'Chưa có tên') ?></strong>
                <small><?= e($row['phone_display'] ?: $row['phone_normalized']) ?></small>
                <?php if (!empty($row['address'])): ?><em><?= e($row['address']) ?></em><?php endif; ?>
              </td>
              <td>
                <span class="blacklist-reason"><?= e($row['blacklist_reason'] ?: 'Chưa ghi lý do') ?></span>
              </td>
              <td>
                <?php if (!empty($row['order_code'])): ?>
                  <a class="blacklist-order" href="<?= e(url('/orders/' . (int) $row['blacklisted_order_id'])) ?>">
                    <strong><?= e($row['order_code']) ?></strong>
                    <small><?= e($row['order_branch_name'] ?: 'Chưa CN') ?> · <?= e($row['order_source_name'] ?: 'Chưa nguồn') ?></small>
                    <small><?= e($statusLabel($row['order_status'] ?? '')) ?> · <?= money((int) ($row['order_total'] ?? 0)) ?></small>
                  </a>
                <?php else: ?>
                  <span class="muted">Không gắn đơn</span>
                <?php endif; ?>
              </td>
              <td>
                <strong><?= e($row['blacklisted_by_name'] ?: 'Không rõ') ?></strong>
                <?php if (!empty($row['blacklisted_by_code'])): ?><small><?= e($row['blacklisted_by_code']) ?></small><?php endif; ?>
              </td>
              <td><?= e($fmtDate($row['blacklisted_at'] ?? $row['updated_at'] ?? null)) ?></td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$rows): ?>
            <tr><td colspan="5" class="empty">Chưa có khách nào trong blacklist.</td></tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </section>
</section>
