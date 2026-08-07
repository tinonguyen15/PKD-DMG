<?php require __DIR__ . '/_nav.php'; ?>

<section class="panel settings-panel settings-page-panel">
  <div class="section-head"><div><h2>Chi nhánh</h2><p class="settings-page-note">Quản lý tên chi nhánh, địa chỉ, số điện thoại và thứ tự hiển thị.</p></div></div>
  <form class="inline-form" method="post" action="<?= e(url('/settings/catalog')) ?>">
    <?= csrf_field() ?>
    <input type="hidden" name="catalog" value="branches">
    <input name="name" placeholder="Tên chi nhánh" required>
    <input name="address" placeholder="Địa chỉ">
    <input name="phone" placeholder="SĐT">
    <input type="number" name="sort_order" placeholder="Thứ tự" value="0">
    <label class="check"><input type="checkbox" name="active" value="1" checked> Bật</label>
    <button class="btn primary" type="submit">Thêm CN</button>
  </form>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Tên</th><th>Địa chỉ</th><th>SĐT</th><th>Thứ tự</th><th>Bật</th><th>Lưu</th></tr></thead>
      <tbody>
        <?php foreach ($branches as $row): ?>
          <tr>
            <form method="post" action="<?= e(url('/settings/catalog')) ?>">
              <?= csrf_field() ?>
              <input type="hidden" name="catalog" value="branches">
              <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
              <td><input name="name" value="<?= e($row['name']) ?>" required></td>
              <td><input name="address" value="<?= e($row['address']) ?>"></td>
              <td><input name="phone" value="<?= e($row['phone']) ?>"></td>
              <td><input type="number" name="sort_order" value="<?= (int) $row['sort_order'] ?>"></td>
              <td><input type="checkbox" name="active" value="1" <?= (int) $row['active'] === 1 ? 'checked' : '' ?>></td>
              <td><button class="btn ghost" type="submit">Lưu</button></td>
            </form>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</section>
