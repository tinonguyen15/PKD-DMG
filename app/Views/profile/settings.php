<section class="panel">
  <div class="section-head">
    <h2>Cài đặt cá nhân</h2>
    <span class="pill"><?= e($targetUser['employee_code'] . ' - ' . $targetUser['name']) ?></span>
  </div>

  <?php if (is_admin()): ?>
    <form class="inline-form" method="get" action="<?= e(url('/profile/settings')) ?>">
      <label>Chọn nhân viên
        <select name="user_id">
          <?php foreach ($users as $user): ?>
            <option value="<?= (int) $user['id'] ?>" <?= (int) $targetUser['id'] === (int) $user['id'] ? 'selected' : '' ?>><?= e($user['employee_code'] . ' - ' . $user['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <button class="btn ghost" type="submit">Xem setup</button>
    </form>
  <?php endif; ?>

  <form class="stack" method="post" action="<?= e(url('/profile/settings')) ?>">
    <?= csrf_field() ?>
    <?php if (is_admin()): ?>
      <input type="hidden" name="target_user_id" value="<?= (int) $targetUser['id'] ?>">
    <?php endif; ?>
    <?php
    $preferenceValues = $preferences['values'];
    $preferenceLocks = $preferences['locks'];
    $preferenceDisableLocked = true;
    $preferenceLockControls = false;
    require dirname(__DIR__) . '/partials/preference_fields.php';
    ?>
    <button class="btn primary" type="submit">Lưu cài đặt cá nhân</button>
  </form>
</section>
