<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($title ?? config('app.name')) ?> - <?= e(config('app.name')) ?></title>
  <link rel="stylesheet" href="<?= e(url('/assets/css/app.css')) ?>">
</head>
<body>
  <?php $user = current_user(); ?>
  <div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="<?= e(url('/')) ?>">
        <span>PKD</span>
        <strong>ĐMG</strong>
      </a>
      <nav>
        <a href="<?= e(url('/')) ?>">Tổng quan</a>
        <a href="<?= e(url('/orders/create')) ?>">Tạo đơn</a>
        <a href="<?= e(url('/orders')) ?>">Đơn hàng</a>
        <a href="<?= e(url('/contacts')) ?>">Tiếp cận</a>
        <a href="<?= e(url('/reports')) ?>">Báo cáo</a>
        <a href="<?= e(url('/profile/settings')) ?>">Cài đặt cá nhân</a>
        <?php if (is_admin()): ?>
          <a href="<?= e(url('/settings')) ?>">Cài đặt</a>
        <?php endif; ?>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-account">
          <strong><?= e($user['name'] ?? '') ?></strong>
          <span><?= e($user['employee_code'] ?? '') ?> - <?= e(strtoupper($user['role'] ?? '')) ?></span>
        </div>
        <form method="post" action="<?= e(url('/logout')) ?>">
          <?= csrf_field() ?>
          <button class="btn ghost full" type="submit">Đăng xuất</button>
        </form>
      </div>
    </aside>
    <main class="main">
      <?php if ($success = flash('success')): ?>
        <div class="alert success"><?= e($success) ?></div>
      <?php endif; ?>
      <?php if ($error = flash('error')): ?>
        <div class="alert danger"><?= e($error) ?></div>
      <?php endif; ?>

      <?= $content ?>
    </main>
  </div>
  <div id="toast-root" class="toast-root"></div>
  <script src="<?= e(url('/assets/js/app.js')) ?>"></script>
  <?php if (($title ?? '') === 'Cài đặt'): ?>
    <script src="<?= e(url('/assets/js/settings-autosave.js?v=20260804-4')) ?>"></script>
  <?php endif; ?>
</body>
</html>
