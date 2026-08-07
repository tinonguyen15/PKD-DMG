<?php require __DIR__ . '/_nav.php'; ?>

<section class="panel settings-panel settings-page-panel">
  <div class="section-head"><div><h2>Món ăn</h2><p class="settings-page-note">Quản lý tên món, tên gửi chi nhánh, tên gửi khách, giá, hình ảnh và thứ tự.</p></div></div>
  <form class="inline-form wide-form" method="post" action="<?= e(url('/settings/catalog')) ?>">
    <?= csrf_field() ?>
    <input type="hidden" name="catalog" value="menu_items">
    <select name="category_id" required>
      <?php foreach ($categories as $category): ?><option value="<?= (int) $category['id'] ?>"><?= e($category['name']) ?></option><?php endforeach; ?>
    </select>
    <input name="slug" placeholder="slug">
    <input name="name" placeholder="Tên món" required>
    <input name="branch_name" placeholder="Tên gửi CN">
    <input name="customer_name" placeholder="Tên gửi KH">
    <input type="number" name="price" placeholder="Giá" min="0" required>
    <input name="unit" placeholder="Đơn vị" value="phần">
    <input name="image_path" placeholder="/assets/images/menu/...">
    <input type="number" name="estimated_guest_count" placeholder="Số khách lẩu" min="0" value="0" title="0 nếu không phải lẩu">
    <input type="number" name="sort_order" placeholder="Thứ tự" value="0">
    <label class="check"><input type="checkbox" name="active" value="1" checked> Bật</label>
    <button class="btn primary" type="submit">Thêm món</button>
  </form>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Loại</th><th>Slug</th><th>Tên</th><th>Gửi CN</th><th>Gửi KH</th><th>Giá</th><th>Đơn vị</th><th>Số khách</th><th>Ảnh</th><th>Thứ tự</th><th>Bật</th><th>Lưu</th></tr></thead>
      <tbody>
        <?php foreach ($items as $row): ?>
          <tr>
            <form method="post" action="<?= e(url('/settings/catalog')) ?>">
              <?= csrf_field() ?>
              <input type="hidden" name="catalog" value="menu_items">
              <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
              <td><select name="category_id"><?php foreach ($categories as $category): ?><option value="<?= (int) $category['id'] ?>" <?= (int) $row['category_id'] === (int) $category['id'] ? 'selected' : '' ?>><?= e($category['name']) ?></option><?php endforeach; ?></select></td>
              <td><input name="slug" value="<?= e($row['slug']) ?>"></td>
              <td><input name="name" value="<?= e($row['name']) ?>" required></td>
              <td><input name="branch_name" value="<?= e($row['branch_name']) ?>"></td>
              <td><input name="customer_name" value="<?= e($row['customer_name']) ?>"></td>
              <td><input type="number" name="price" value="<?= (int) $row['price'] ?>" min="0"></td>
              <td><input name="unit" value="<?= e($row['unit']) ?>"></td>
              <td><input type="number" name="estimated_guest_count" value="<?= (int) ($row['estimated_guest_count'] ?? 0) ?>" min="0"></td>
              <td><input name="image_path" value="<?= e($row['image_path']) ?>"></td>
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
