<?php require __DIR__ . '/_nav.php'; ?>

<section class="panel settings-panel settings-page-panel">
  <div class="section-head">
    <div>
      <h2>Cài đặt hệ thống</h2>
      <p class="settings-page-note">Mẫu copy đơn hàng, mặc định tạo đơn, món ghim, tag/lưu ý gửi CN và các mặc định hệ thống.</p>
    </div>
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
