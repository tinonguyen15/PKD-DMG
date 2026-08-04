<?php
$renderSimpleCatalog = function (string $title, string $catalog, array $rows): void {
    ?>
    <details class="panel settings-panel" open>
      <summary><?= e($title) ?></summary>
      <form class="inline-form" method="post" action="<?= e(url('/settings/catalog')) ?>">
        <?= csrf_field() ?>
        <input type="hidden" name="catalog" value="<?= e($catalog) ?>">
        <?php if ($catalog === 'menu_categories'): ?>
          <input name="slug" placeholder="slug">
        <?php endif; ?>
        <input name="name" placeholder="Tên" required>
        <input type="number" name="sort_order" placeholder="Thứ tự" value="0">
        <label class="check"><input type="checkbox" name="active" value="1" checked> Bật</label>
        <button class="btn primary" type="submit">Thêm</button>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><?php if ($catalog === 'menu_categories'): ?><th>Slug</th><?php endif; ?><th>Tên</th><th>Thứ tự</th><th>Bật</th><th>Lưu</th></tr></thead>
          <tbody>
            <?php foreach ($rows as $row): ?>
              <tr>
                <form method="post" action="<?= e(url('/settings/catalog')) ?>">
                  <?= csrf_field() ?>
                  <input type="hidden" name="catalog" value="<?= e($catalog) ?>">
                  <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
                  <td><?= (int) $row['id'] ?></td>
                  <?php if ($catalog === 'menu_categories'): ?>
                    <td><input name="slug" value="<?= e($row['slug']) ?>"></td>
                  <?php endif; ?>
                  <td><input name="name" value="<?= e($row['name']) ?>" required></td>
                  <td><input type="number" name="sort_order" value="<?= (int) $row['sort_order'] ?>"></td>
                  <td><input type="checkbox" name="active" value="1" <?= (int) $row['active'] === 1 ? 'checked' : '' ?>></td>
                  <td><button class="btn ghost" type="submit">Lưu</button></td>
                </form>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </details>
    <?php
};
?>

<section class="panel settings-panel">
  <div class="section-head">
    <h2>Cài đặt hệ thống</h2>
  </div>
  <form class="stack" method="post" action="<?= e(url('/settings/system-preferences')) ?>">
    <?= csrf_field() ?>
    <?php
    $preferenceValues = $systemPreferences['values'];
    $preferenceLocks = $systemPreferences['locks'];
    $preferenceDisableLocked = false;
    $preferenceLockControls = true;
    require __DIR__ . '/../partials/preference_fields.php';
    ?>
    <button class="btn primary" type="submit">Lưu cài đặt hệ thống</button>
  </form>
</section>

<section class="content-grid two">
  <details class="panel settings-panel" open>
    <summary>Cài đặt tài khoản nhân viên</summary>
    <form class="inline-form" method="post" action="<?= e(url('/settings/users')) ?>">
      <?= csrf_field() ?>
      <input name="employee_code" placeholder="Mã NV" required>
      <input name="username" placeholder="Username" required>
      <input name="name" placeholder="Tên nhân viên" required>
      <input name="password" placeholder="Mật khẩu" required>
      <select name="role">
        <option value="staff">Nhân viên</option>
        <option value="admin">Admin</option>
      </select>
      <label class="check"><input type="checkbox" name="active" value="1" checked> Bật</label>
      <button class="btn primary" type="submit">Thêm tài khoản</button>
    </form>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Mã</th><th>Username</th><th>Tên</th><th>Quyền</th><th>Mật khẩu mới</th><th>Bật</th><th>Setup</th><th>Lưu</th></tr></thead>
        <tbody>
          <?php foreach ($users as $row): ?>
            <tr>
              <form method="post" action="<?= e(url('/settings/users')) ?>">
                <?= csrf_field() ?>
                <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
                <td><input name="employee_code" value="<?= e($row['employee_code']) ?>" required></td>
                <td><input name="username" value="<?= e($row['username']) ?>" required></td>
                <td><input name="name" value="<?= e($row['name']) ?>" required></td>
                <td>
                  <select name="role">
                    <option value="staff" <?= $row['role'] === 'staff' ? 'selected' : '' ?>>Nhân viên</option>
                    <option value="admin" <?= $row['role'] === 'admin' ? 'selected' : '' ?>>Admin</option>
                  </select>
                </td>
                <td><input name="password" placeholder="Để trống nếu không đổi"></td>
                <td><input type="checkbox" name="active" value="1" <?= (int) $row['active'] === 1 ? 'checked' : '' ?>></td>
                <td><a class="btn ghost" href="<?= e(url('/profile/settings?user_id=' . (int) $row['id'])) ?>">Setup</a></td>
                <td><button class="btn ghost" type="submit">Lưu</button></td>
              </form>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </details>

  <details class="panel settings-panel" open>
    <summary>Chi nhánh</summary>
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
  </details>
</section>

<section class="content-grid two">
  <?php $renderSimpleCatalog('Danh mục món', 'menu_categories', $categories); ?>
  <?php $renderSimpleCatalog('Nguồn đơn', 'order_sources', $sources); ?>
  <?php $renderSimpleCatalog('Thanh toán', 'payment_methods', $payments); ?>
</section>

<details class="panel settings-panel">
  <summary>Món ăn</summary>
  <form class="inline-form wide-form" method="post" action="<?= e(url('/settings/catalog')) ?>">
    <?= csrf_field() ?>
    <input type="hidden" name="catalog" value="menu_items">
    <select name="category_id" required>
      <?php foreach ($categories as $category): ?>
        <option value="<?= (int) $category['id'] ?>"><?= e($category['name']) ?></option>
      <?php endforeach; ?>
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
      <thead><tr><th>Loại</th><th>Slug</th><th>Tên</th><th>Gửi CN</th><th>Giá</th><th>Đơn vị</th><th>Số khách</th><th>Thứ tự</th><th>Bật</th><th>Lưu</th></tr></thead>
      <tbody>
        <?php foreach ($items as $row): ?>
          <tr>
            <form method="post" action="<?= e(url('/settings/catalog')) ?>">
              <?= csrf_field() ?>
              <input type="hidden" name="catalog" value="menu_items">
              <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
              <input type="hidden" name="image_path" value="<?= e($row['image_path']) ?>">
              <input type="hidden" name="customer_name" value="<?= e($row['customer_name']) ?>">
              <td>
                <select name="category_id">
                  <?php foreach ($categories as $category): ?>
                    <option value="<?= (int) $category['id'] ?>" <?= (int) $row['category_id'] === (int) $category['id'] ? 'selected' : '' ?>><?= e($category['name']) ?></option>
                  <?php endforeach; ?>
                </select>
              </td>
              <td><input name="slug" value="<?= e($row['slug']) ?>"></td>
              <td><input name="name" value="<?= e($row['name']) ?>" required></td>
              <td><input name="branch_name" value="<?= e($row['branch_name']) ?>"></td>
              <td><input type="number" name="price" value="<?= (int) $row['price'] ?>" min="0"></td>
              <td><input name="unit" value="<?= e($row['unit']) ?>"></td>
              <td><input type="number" name="estimated_guest_count" value="<?= (int) ($row['estimated_guest_count'] ?? 0) ?>" min="0" title="0 nếu không phải lẩu"></td>
              <td><input type="number" name="sort_order" value="<?= (int) $row['sort_order'] ?>"></td>
              <td><input type="checkbox" name="active" value="1" <?= (int) $row['active'] === 1 ? 'checked' : '' ?>></td>
              <td><button class="btn ghost" type="submit">Lưu</button></td>
            </form>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</details>

<details class="panel settings-panel">
  <summary>Tin nhắn mẫu</summary>
  <form class="stack" method="post" action="<?= e(url('/settings/catalog')) ?>">
    <?= csrf_field() ?>
    <input type="hidden" name="catalog" value="message_templates">
    <div class="form-grid">
      <label>Danh mục
        <select name="category_id">
          <?php foreach ($messageCategories as $category): ?>
            <option value="<?= (int) $category['id'] ?>"><?= e($category['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Tiêu đề <input name="title" required></label>
      <label>Thứ tự <input type="number" name="sort_order" value="0"></label>
      <label class="check"><input type="checkbox" name="is_pinned" value="1"> Ghim</label>
      <label class="check"><input type="checkbox" name="active" value="1" checked> Bật</label>
      <label class="wide">Nội dung <textarea name="content" rows="3" required></textarea></label>
      <label class="wide">Từ khóa <input name="keywords"></label>
    </div>
    <button class="btn primary" type="submit">Thêm mẫu</button>
  </form>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Danh mục</th><th>Tiêu đề</th><th>Nội dung</th><th>Ghim</th><th>Bật</th><th>Lưu</th></tr></thead>
      <tbody>
        <?php foreach ($messageTemplates as $row): ?>
          <tr>
            <form method="post" action="<?= e(url('/settings/catalog')) ?>">
              <?= csrf_field() ?>
              <input type="hidden" name="catalog" value="message_templates">
              <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
              <input type="hidden" name="sort_order" value="<?= (int) $row['sort_order'] ?>">
              <input type="hidden" name="keywords" value="<?= e($row['keywords']) ?>">
              <td>
                <select name="category_id">
                  <?php foreach ($messageCategories as $category): ?>
                    <option value="<?= (int) $category['id'] ?>" <?= (int) $row['category_id'] === (int) $category['id'] ? 'selected' : '' ?>><?= e($category['name']) ?></option>
                  <?php endforeach; ?>
                </select>
              </td>
              <td><input name="title" value="<?= e($row['title']) ?>"></td>
              <td><textarea name="content" rows="2"><?= e($row['content']) ?></textarea></td>
              <td><input type="checkbox" name="is_pinned" value="1" <?= (int) $row['is_pinned'] === 1 ? 'checked' : '' ?>></td>
              <td><input type="checkbox" name="active" value="1" <?= (int) $row['active'] === 1 ? 'checked' : '' ?>></td>
              <td><button class="btn ghost" type="submit">Lưu</button></td>
            </form>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</details>
