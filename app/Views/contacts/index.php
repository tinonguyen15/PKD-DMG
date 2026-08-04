<?php
$old = $old ?: [];
$formatDate = static function (mixed $value): string {
    $timestamp = strtotime((string) $value);
    return $timestamp ? date('d/m/Y', $timestamp) : '';
};
$addDate = (string) ($old['report_date'] ?? $filters['date_from'] ?? today());
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $addDate)) {
    $addDate = today();
}
?>

<?php if ($errors): ?>
  <div class="alert danger">
    <?php foreach ($errors as $message): ?><div><?= e($message) ?></div><?php endforeach; ?>
  </div>
<?php endif; ?>

<section
  class="panel"
  data-contacts-page
  data-contact-save-url="<?= e(url('/contacts')) ?>"
  data-contact-csrf="<?= e(\App\Core\Csrf::token()) ?>"
>
  <div class="section-head">
    <div>
      <h2>Thêm dòng tiếp nhận</h2>
      <p class="muted">Dùng cho lượt tiếp nhận chưa tạo đơn. Dòng mới lấy ngày đang lọc: <?= e($formatDate($addDate)) ?>.</p>
    </div>
  </div>

  <form class="filter-grid" method="post" action="<?= e(url('/contacts')) ?>">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="add_row">
    <input type="hidden" name="report_date" value="<?= e($addDate) ?>">
    <label>Chi nhánh
      <select name="branch_id" required>
        <option value="">Chọn chi nhánh</option>
        <?php foreach ($branches as $branch): ?>
          <option value="<?= (int) $branch['id'] ?>" <?= (int) ($old['branch_id'] ?? 0) === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label>Kênh
      <select name="channel" required>
        <?php foreach ($channels as $key => $label): ?>
          <option value="<?= e($key) ?>" <?= ($old['channel'] ?? 'zalo_branch') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <button class="btn primary" type="submit">Thêm dòng</button>
  </form>
</section>

<section class="panel">
  <form class="filter-grid" method="get" action="<?= e(url('/contacts')) ?>">
    <div class="section-head wide">
      <h2>Lọc tiếp nhận</h2>
    </div>
    <label>Từ ngày <input type="date" name="date_from" value="<?= e($filters['date_from'] ?? today()) ?>"></label>
    <label>Đến ngày <input type="date" name="date_to" value="<?= e($filters['date_to'] ?? today()) ?>"></label>
    <label>Chi nhánh
      <select name="branch_id">
        <option value="">Tất cả</option>
        <?php foreach ($branches as $branch): ?>
          <option value="<?= (int) $branch['id'] ?>" <?= (int) ($filters['branch_id'] ?? 0) === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label>Kênh
      <select name="channel">
        <option value="">Tất cả</option>
        <?php foreach ($channels as $key => $label): ?>
          <option value="<?= e($key) ?>" <?= ($filters['channel'] ?? '') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <button class="btn primary" type="submit">Lọc</button>
  </form>
</section>

<section class="panel">
  <div class="section-head">
    <h2>Bảng tiếp nhận</h2>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Ngày</th>
          <th>Chi nhánh</th>
          <th>Kênh</th>
          <th>Tiếp nhận</th>
          <th>Đơn hàng</th>
          <th>Doanh thu</th>
          <th>TB doanh thu/đơn</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($rows as $row): ?>
          <tr data-contact-row>
            <td><?= e($formatDate($row['report_date'])) ?></td>
            <td><?= e($row['branch_name']) ?></td>
            <td><?= e($channels[$row['channel']] ?? $row['channel']) ?></td>
            <td>
              <input
                class="compact"
                type="number"
                min="0"
                inputmode="numeric"
                value="<?= (int) $row['received_count'] ?>"
                data-contact-received
                data-contact-report-date="<?= e($row['report_date']) ?>"
                data-contact-branch-id="<?= (int) $row['branch_id'] ?>"
                data-contact-channel="<?= e($row['channel']) ?>"
              >
            </td>
            <td><?= (int) ($row['order_count'] ?? 0) ?></td>
            <td><?= money((int) ($row['revenue'] ?? 0)) ?></td>
            <td><?= money((int) ($row['average_revenue_per_order'] ?? 0)) ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if (!$rows): ?>
          <tr><td colspan="7" class="empty">Chưa có dòng tiếp nhận.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</section>
