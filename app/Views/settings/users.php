<?php require __DIR__ . '/_nav.php'; ?>

<section class="panel settings-panel settings-page-panel">
  <div class="section-head"><div><h2>Tài khoản nhân viên</h2><p class="settings-page-note">Thêm/sửa tài khoản đăng nhập, quyền admin/staff và trạng thái hoạt động.</p></div></div>
  <form class="inline-form" method="post" action="<?= e(url('/settings/users')) ?>">
    <?= csrf_field() ?>
    <input name="employee_code" placeholder="Mã NV" required>
    <input name="username" placeholder="Username" required>
    <input name="name" placeholder="Tên nhân viên" required>
    <input name="password" placeholder="Mật khẩu" required>
    <select name="role"><option value="staff">Nhân viên</option><option value="admin">Admin</option></select>
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
              <td><select name="role"><option value="staff" <?= $row['role'] === 'staff' ? 'selected' : '' ?>>Nhân viên</option><option value="admin" <?= $row['role'] === 'admin' ? 'selected' : '' ?>>Admin</option></select></td>
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
</section>
