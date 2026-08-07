<link rel="stylesheet" href="<?= e(asset_url('/assets/css/settings-system.css')) ?>">

<?php require __DIR__ . '/_nav.php'; ?>

<section class="panel settings-panel settings-page-panel settings-system-page">
  <div class="section-head settings-system-titlebar">
    <div>
      <span class="settings-kicker">Quản trị vận hành</span>
      <h2>Cài đặt hệ thống</h2>
      <p class="settings-page-note">Mẫu copy đơn hàng, mặc định tạo đơn, món ghim, tag/lưu ý gửi CN và các mặc định hệ thống.</p>
    </div>
    <a class="btn ghost" href="<?= e(url('/settings')) ?>">← Về trung tâm cài đặt</a>
  </div>
  <form class="stack settings-system-form" method="post" action="<?= e(url('/settings/system-preferences')) ?>">
    <?= csrf_field() ?>
    <?php
    $preferenceValues = $systemPreferences['values'];
    $preferenceLocks = $systemPreferences['locks'];
    $preferenceDisableLocked = false;
    $preferenceLockControls = true;
    require __DIR__ . '/../partials/preference_fields.php';
    ?>
    <div class="settings-save-bar">
      <div>
        <strong>Lưu toàn bộ cài đặt hệ thống</strong>
        <span>Sau khi lưu, màn tạo đơn sẽ dùng mẫu và cấu hình mới.</span>
      </div>
      <button class="btn primary" type="submit">Lưu cài đặt hệ thống</button>
    </div>
  </form>
</section>
