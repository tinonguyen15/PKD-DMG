<?php
$loginError = flash('error');
$oldUsername = flash('old_username') ?: '';

$assetImageUrl = static function (array $preferredNames, array $fallbackPatterns = []): ?string {
    $imageDir = dirname(__DIR__, 3) . '/public/assets/images';
    $allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];

    $toUrl = static function (string $filename): string {
        return url('/assets/images/' . rawurlencode($filename));
    };

    foreach ($preferredNames as $name) {
        $name = basename((string) $name);
        $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if ($name !== '' && in_array($extension, $allowedExtensions, true) && is_file($imageDir . '/' . $name)) {
            return $toUrl($name);
        }
    }

    foreach ($fallbackPatterns as $pattern) {
        foreach (glob($imageDir . '/' . $pattern) ?: [] as $path) {
            $name = basename($path);
            $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if (in_array($extension, $allowedExtensions, true) && is_file($path)) {
                return $toUrl($name);
            }
        }
    }

    return null;
};

$logoUrl = $assetImageUrl(
    ['logo.png', 'logo.webp', 'logo.jpg', 'logo.jpeg', 'dmg-logo.png', 'pkd-logo.png', 'brand-logo.png', 'dmh-logo.png'],
    ['*logo*.png', '*logo*.webp', '*logo*.jpg', '*logo*.jpeg', '*Logo*.png', '*Logo*.webp', '*dmg*.png', '*DMG*.png']
);

$loginBannerUrl = $assetImageUrl(
    ['login-banner.png', 'login-banner.webp', 'login-banner.jpg', 'login-banner.jpeg', 'banner-login.png', 'banner.png', 'cover.png', 'hero.png'],
    ['*login*banner*.png', '*login*banner*.webp', '*login*banner*.jpg', '*banner*.png', '*banner*.webp', '*banner*.jpg', '*cover*.png', '*hero*.png']
);
?>

<main class="login-shell">
  <div class="login-stage">
    <section class="login-visual" aria-label="Giới thiệu hệ thống">
      <div class="login-visual-inner">
        <div class="login-hero-brand">
          <span class="login-brand-mark <?= $logoUrl ? 'has-image' : '' ?>">
            <?php if ($logoUrl): ?>
              <img src="<?= e($logoUrl) ?>" alt="Đắng Mà Ghiền">
            <?php else: ?>
              <b>ĐMG</b>
            <?php endif; ?>
          </span>
          <span>
            <strong>PKD Đắng Mà Ghiền</strong>
            <small>Web order nội bộ</small>
          </span>
        </div>

        <div class="login-banner-frame <?= $loginBannerUrl ? 'has-image' : 'is-fallback' ?>">
          <?php if ($loginBannerUrl): ?>
            <img src="<?= e($loginBannerUrl) ?>" alt="PKD Đắng Mà Ghiền">
          <?php endif; ?>
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
          <span class="login-logo <?= $logoUrl ? 'has-image' : '' ?>">
            <?php if ($logoUrl): ?>
              <img src="<?= e($logoUrl) ?>" alt="PKD Đắng Mà Ghiền">
            <?php else: ?>
              <b>PKD</b>
            <?php endif; ?>
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
  </div>
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
