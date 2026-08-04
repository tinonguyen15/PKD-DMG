<?php $old = $old ?: []; ?>

<?php if ($errors): ?>
  <div class="alert danger">
    <?php foreach ($errors as $message): ?><div><?= e($message) ?></div><?php endforeach; ?>
  </div>
<?php endif; ?>

<section class="content-grid one">
  <!-- <form class="panel stack" method="post" action="<?= e(url('/contacts')) ?>">
    <?= csrf_field() ?>
    <div class="section-head">
      <h2>Tiếp cận</h2>
    </div>
    <div class="form-grid">
      <label>Ngày
        <input type="date" name="report_date" value="<?= e($old['report_date'] ?? today()) ?>" required>
      </label>
      <?php if (is_admin()): ?>
        <label>Nhân viên
          <select name="user_id" required>
            <?php foreach ($users as $user): ?>
              <option value="<?= (int) $user['id'] ?>" <?= (int) ($old['user_id'] ?? current_user()['id']) === (int) $user['id'] ? 'selected' : '' ?>><?= e($user['employee_code'] . ' - ' . $user['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
      <?php endif; ?>
      <label>Chi nhánh
        <select name="branch_id" required>
          <option value="">Chọn CN</option>
          <?php foreach ($branches as $branch): ?>
            <option value="<?= (int) $branch['id'] ?>" <?= (int) ($old['branch_id'] ?? 0) === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Kênh
        <select name="channel" required>
          <?php foreach ($channels as $key => $label): ?>
            <option value="<?= e($key) ?>" <?= ($old['channel'] ?? '') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Tiếp nhận
        <input type="number" min="0" name="received_count" value="<?= e($old['received_count'] ?? 0) ?>">
      </label>
      <label>Đủ điều kiện
        <input type="number" min="0" name="qualified_count" value="<?= e($old['qualified_count'] ?? 0) ?>">
      </label>
      <label>Chốt đơn
        <input type="number" min="0" name="order_count" value="<?= e($old['order_count'] ?? 0) ?>">
      </label>
      <label>Hủy/Không chốt
        <input type="number" min="0" name="cancelled_count" value="<?= e($old['cancelled_count'] ?? 0) ?>">
      </label>
      <label class="wide">Ghi chú
        <input name="note" value="<?= e($old['note'] ?? '') ?>">
      </label>
    </div>
    <button class="btn primary" type="submit">Lưu tiếp cận</button>
  </form> -->

  <form class="panel filter-grid" method="get" action="<?= e(url('/contacts')) ?>">
    <div class="section-head wide">
      <h2>Lọc dữ liệu</h2>
    </div>
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
    <h2>Dữ liệu tiếp cận</h2>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Ngày</th>
          <th>Nhân viên</th>
          <th>Chi nhánh</th>
          <th>Kênh</th>
          <th>Tiếp nhận</th>
          <th>Đơn hàng</th>
          <th>Doanh số</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($rows as $row): ?>
          <tr>
            <td><?= e($row['report_date']) ?></td>
            <td><?= e($row['employee_code'] . ' - ' . $row['staff_name']) ?></td>
            <td><?= e($row['branch_name']) ?></td>
            <td><?= e($channels[$row['channel']] ?? $row['channel']) ?></td>
            <td><?= (int) $row['received_count'] ?></td>
            <td><?= (int) $row['order_count'] ?></td>
            <td><?= e($row['note']) ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if (!$rows): ?>
          <tr><td colspan="9" class="empty">Chưa có dữ liệu.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</section>
