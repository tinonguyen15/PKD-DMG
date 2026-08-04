<?php $old = $old ?: []; ?>

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
      <h2>Trang tiếp nhận</h2>
      <p class="muted">Đơn mới sẽ tự tạo dòng theo chi nhánh và kênh. Số tiếp nhận nhập trực tiếp trong bảng và tự lưu.</p>
    </div>
  </div>

  <form class="inline-form" method="post" action="<?= e(url('/contacts')) ?>">
    <?= csrf_field() ?>
    <input type="hidden" name="report_date" value="<?= e($filters['date_from'] ?? today()) ?>">
    <select name="branch_id" required>
      <option value="">Chọn chi nhánh</option>
      <?php foreach ($branches as $branch): ?>
        <option value="<?= (int) $branch['id'] ?>" <?= (int) ($old['branch_id'] ?? 0) === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
      <?php endforeach; ?>
    </select>
    <select name="channel" required>
      <?php foreach ($channels as $key => $label): ?>
        <option value="<?= e($key) ?>" <?= ($old['channel'] ?? 'zalo_oa') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
      <?php endforeach; ?>
    </select>
    <button class="btn primary" type="submit">Thêm dòng</button>
  </form>
</section>

<section class="panel filter-grid">
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
        </tr>
      </thead>
      <tbody>
        <?php foreach ($rows as $row): ?>
          <tr data-contact-row>
            <td><?= e($row['report_date']) ?></td>
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
                data-contact-id="<?= (int) $row['id'] ?>"
              >
            </td>
            <td><?= (int) $row['order_count'] ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if (!$rows): ?>
          <tr><td colspan="5" class="empty">Chưa có dòng tiếp nhận.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</section>
