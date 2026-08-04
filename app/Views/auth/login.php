<?php
$loginError = flash('error');
$oldUsername = flash('old_username') ?: '';
$logoUrl = url('/assets/images/logo.png');
$loginBannerUrl = url('/assets/images/login-banner.png');
?>

<main class="login-shell">
  <section class="login-hero" aria-label="Giới thiệu hệ thống">
    <div class="login-hero-card">
      <div class="login-hero-brand">
        <span class="login-brand-mark">
          <img src="<?= e($logoUrl) ?>" alt="Đắng Mà Ghiền" onerror="this.hidden=true; this.nextElementSibling.hidden=false;">
          <b hidden>ĐMG</b>
        </span>
        <span>
          <strong>PKD Đắng Mà Ghiền</strong>
          <small>Web order nội bộ</small>
        </span>
      </div>

      <div class="login-banner-frame">
        <img src="<?= e($loginBannerUrl) ?>" alt="PKD Đắng Mà Ghiền" onerror="this.closest('.login-banner-frame').classList.add('is-fallback'); this.remove();">
        <div class="login-banner-fallback">
          <span>PKD</span>
          <strong>Quản lý đơn hàng<br>và tiếp nhận tập trung</strong>
          <small>Đơn hàng · Tiếp nhận · Báo cáo</small>
        </div>
      </div>

      <div class="login-feature-grid">
        <div>
          <strong>Đơn hàng</strong>
          <span>Tạo đơn, chuyển chi nhánh, theo dõi trạng thái.</span>
        </div>
        <div>
          <strong>Tiếp nhận</strong>
          <span>Ghi nhận theo ngày, kênh và chi nhánh.</span>
        </div>
        <div>
          <strong>Báo cáo</strong>
          <span>Xem doanh thu, số khách và hiệu suất vận hành.</span>
        </div>
      </div>
    </div>
  </section>

  <section class="login-panel" aria-label="Đăng nhập hệ thống">
    <div class="login-card">
      <div class="login-card-head">
        <span class="login-logo">
          <img src="<?= e($logoUrl) ?>" alt="PKD Đắng Mà Ghiền" onerror="this.hidden=true; this.nextElementSibling.hidden=false;">
          <b hidden>PKD</b>
        </span>
        <div>
          <p class="login-eyebrow">PKD ĐẮNG MÀ GHIỀN</p>
          <h2>Đăng nhập</h2>
          <p>Nhập tài khoản được cấp để truy cập hệ thống.</p>
        </div>
      </div>

      <?php if ($loginError): ?>
        <div class="login-alert" role="alert"><?= e($loginError) ?></div>
      <?php endif; ?>

      <form method="post" action="<?= e(url('/login')) ?>" class="login-form">
        <?= csrf_field() ?>

        <label class="login-field">Tài khoản hoặc mã nhân viên
          <input
            name="username"
            value="<?= e($oldUsername) ?>"
            autocomplete="username"
            placeholder="Nhập tài khoản hoặc mã NV"
            autofocus
            required
          >
        </label>

        <label class="login-field">Mật khẩu
          <span class="login-password-wrap">
            <input
              id="loginPassword"
              type="password"
              name="password"
              autocomplete="current-password"
              placeholder="Nhập mật khẩu"
              required
            >
            <button class="password-toggle" type="button" data-toggle-password aria-controls="loginPassword" aria-label="Hiện mật khẩu">Hiện</button>
          </span>
        </label>

        <button class="login-submit" type="submit">Đăng nhập</button>
      </form>

      <p class="login-help">
        Nếu quên mật khẩu hoặc chưa có quyền truy cập, vui lòng liên hệ quản trị viên.
      </p>
    </div>
  </section>
</main>

<script>
  (function () {
    const button = document.querySelector('[data-toggle-password]');
    const input = document.getElementById('loginPassword');
    if (!button || !input) return;

    button.addEventListener('click', function () {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      button.textContent = isHidden ? 'Ẩn' : 'Hiện';
      button.setAttribute('aria-label', isHidden ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      input.focus();
    });
  })();
</script>
