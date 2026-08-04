<main class="login-shell">
  <section class="login-panel">
    <p class="eyebrow">PKD Đắng Mà Ghiền</p>
    <h1>Đăng nhập</h1>
    <?php if ($error = flash('error')): ?>
      <div class="alert danger"><?= e($error) ?></div>
    <?php endif; ?>
    <form method="post" action="<?= e(url('/login')) ?>" class="stack">
      <?= csrf_field() ?>
      <label>Tài khoản hoặc mã NV
        <input name="username" autocomplete="username" autofocus required>
      </label>
      <label>Mật khẩu
        <input type="password" name="password" autocomplete="current-password" required>
      </label>
      <button class="btn primary" type="submit">Đăng nhập</button>
    </form>
    <p class="muted small">Mặc định sau khi import seed: admin/admin123456 hoặc sale001/staff123456.</p>
  </section>
</main>
