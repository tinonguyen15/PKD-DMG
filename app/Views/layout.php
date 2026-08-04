<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($title ?? config('app.name')) ?> - <?= e(config('app.name')) ?></title>
  <link rel="stylesheet" href="<?= e(url('/assets/css/app.css')) ?>">
  <link rel="stylesheet" href="<?= e(url('/assets/css/sidebar.css?v=20260805-1')) ?>">
  <link rel="stylesheet" href="<?= e(url('/assets/css/brand-assets.css?v=20260805-3')) ?>">
  <?php if (($title ?? '') === 'Tạo đơn'): ?>
    <link rel="stylesheet" href="<?= e(url('/assets/css/customer-insights.css?v=20260805-2')) ?>">
  <?php endif; ?>
</head>
<body>
  <?php
    $user = current_user();

    $assetImageUrl = static function (array $preferredNames, array $fallbackPatterns = []): ?string {
        $imageRoot = dirname(__DIR__, 2) . '/public/assets/images';
        $allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];
        $searchDirectories = [
            ['dir' => $imageRoot, 'url' => '/assets/images'],
            ['dir' => $imageRoot . '/lib', 'url' => '/assets/images/lib'],
        ];

        $toUrl = static function (string $baseUrl, string $filename): string {
            return url(rtrim($baseUrl, '/') . '/' . rawurlencode($filename));
        };

        foreach ($preferredNames as $name) {
            $name = basename((string) $name);
            $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if ($name === '' || !in_array($extension, $allowedExtensions, true)) {
                continue;
            }

            foreach ($searchDirectories as $directory) {
                $path = $directory['dir'] . '/' . $name;
                if (is_file($path)) {
                    return $toUrl($directory['url'], $name);
                }
            }
        }

        foreach ($fallbackPatterns as $pattern) {
            foreach ($searchDirectories as $directory) {
                foreach (glob($directory['dir'] . '/' . $pattern) ?: [] as $path) {
                    $name = basename($path);
                    $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                    if (in_array($extension, $allowedExtensions, true) && is_file($path)) {
                        return $toUrl($directory['url'], $name);
                    }
                }
            }
        }

        return null;
    };

    $logoUrl = $assetImageUrl(
        ['logo.png', 'logo.webp', 'logo.jpg', 'logo.jpeg', 'dmg-logo.png', 'pkd-logo.png', 'brand-logo.png', 'dmh-logo.png'],
        ['*logo*.png', '*logo*.webp', '*logo*.jpg', '*logo*.jpeg', '*Logo*.png', '*Logo*.webp', '*LOGO*.png', '*dmg*.png', '*DMG*.png']
    );

    $currentPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
    $currentPath = '/' . trim($currentPath, '/');
    $currentPath = $currentPath === '/' ? '/' : rtrim($currentPath, '/');

    $normalizePath = static function (string $path): string {
        $path = parse_url($path, PHP_URL_PATH) ?: $path;
        $path = '/' . trim($path, '/');
        return $path === '/' ? '/' : rtrim($path, '/');
    };

    $isNavActive = static function (string $path, bool $prefix = true, array $exclude = []) use ($currentPath, $normalizePath): bool {
        foreach ($exclude as $excludedPath) {
            $excludedPath = $normalizePath((string) $excludedPath);
            if ($currentPath === $excludedPath || str_starts_with($currentPath, $excludedPath . '/')) {
                return false;
            }
        }

        $path = $normalizePath($path);
        if ($currentPath === $path) {
            return true;
        }

        return $prefix && $path !== '/' && str_starts_with($currentPath, $path . '/');
    };

    $navGroups = [
        [
            'label' => 'Vận hành',
            'items' => [
                ['href' => '/', 'icon' => '⌂', 'label' => 'Tổng quan', 'desc' => 'Bảng điều khiển', 'active' => $isNavActive('/', false)],
                ['href' => '/orders/create', 'icon' => '+', 'label' => 'Tạo đơn', 'desc' => 'Lên đơn nhanh', 'active' => $isNavActive('/orders/create')],
                ['href' => '/orders', 'icon' => '▦', 'label' => 'Đơn hàng', 'desc' => 'Kanban trạng thái', 'active' => $isNavActive('/orders', true, ['/orders/create'])],
                ['href' => '/contacts', 'icon' => '☏', 'label' => 'Tiếp nhận', 'desc' => 'Kênh & chi nhánh', 'active' => $isNavActive('/contacts')],
            ],
        ],
        [
            'label' => 'Phân tích',
            'items' => [
                ['href' => '/reports', 'icon' => '◴', 'label' => 'Báo cáo', 'desc' => 'Doanh thu & hiệu suất', 'active' => $isNavActive('/reports')],
            ],
        ],
        [
            'label' => 'Tài khoản',
            'items' => [
                ['href' => '/profile/settings', 'icon' => '⚙', 'label' => 'Cài đặt cá nhân', 'desc' => 'Mẫu copy & mặc định', 'active' => $isNavActive('/profile/settings')],
            ],
        ],
    ];

    if (is_admin()) {
        $navGroups[] = [
            'label' => 'Quản trị',
            'items' => [
                ['href' => '/settings', 'icon' => '✦', 'label' => 'Cài đặt hệ thống', 'desc' => 'Menu, CN, user, nguồn', 'active' => $isNavActive('/settings')],
            ],
        ];
    }

    $roleLabel = strtoupper((string) ($user['role'] ?? ''));
    $userName = trim((string) ($user['name'] ?? ''));
    $initial = mb_substr($userName !== '' ? $userName : 'U', 0, 1, 'UTF-8');
  ?>
  <div class="app-shell">
    <aside class="sidebar" aria-label="Menu chính">
      <div class="sidebar-top">
        <a class="brand" href="<?= e(url('/')) ?>" aria-label="Về tổng quan">
          <span class="brand-mark <?= $logoUrl ? 'has-image' : '' ?>">
            <?php if ($logoUrl): ?>
              <img src="<?= e($logoUrl) ?>" alt="Đắng Mà Ghiền">
            <?php else: ?>
              <b>ĐMG</b>
            <?php endif; ?>
          </span>
          <span class="brand-copy">
            <strong>PKD ĐMG</strong>
            <small>Order nội bộ</small>
          </span>
        </a>

        <div class="sidebar-quick">
          <a class="quick-create" href="<?= e(url('/orders/create')) ?>">
            <span>+</span>
            <strong>Tạo đơn mới</strong>
          </a>
          <div class="quick-row">
            <a href="<?= e(url('/orders')) ?>">Đơn hàng</a>
            <a href="<?= e(url('/contacts')) ?>">Tiếp nhận</a>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <?php foreach ($navGroups as $group): ?>
          <section class="nav-section" aria-label="<?= e($group['label']) ?>">
            <p class="nav-section-title"><?= e($group['label']) ?></p>
            <?php foreach ($group['items'] as $item): ?>
              <a
                class="nav-link <?= !empty($item['active']) ? 'active' : '' ?>"
                href="<?= e(url($item['href'])) ?>"
                <?= !empty($item['active']) ? 'aria-current="page"' : '' ?>
              >
                <span class="nav-icon" aria-hidden="true"><?= e($item['icon']) ?></span>
                <span class="nav-copy">
                  <strong><?= e($item['label']) ?></strong>
                  <small><?= e($item['desc']) ?></small>
                </span>
              </a>
            <?php endforeach; ?>
          </section>
        <?php endforeach; ?>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-account">
          <span class="account-avatar"><?= e($initial) ?></span>
          <span class="account-copy">
            <strong><?= e($userName) ?></strong>
            <small><?= e($user['employee_code'] ?? '') ?><?= $roleLabel !== '' ? ' · ' . e($roleLabel) : '' ?></small>
          </span>
        </div>
        <form method="post" action="<?= e(url('/logout')) ?>">
          <?= csrf_field() ?>
          <button class="btn ghost full sidebar-logout" type="submit">Đăng xuất</button>
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
  <?php if (($title ?? '') === 'Tạo đơn'): ?>
    <script src="<?= e(url('/assets/js/customer-insights.js?v=20260805-2')) ?>"></script>
  <?php endif; ?>
  <?php if (($title ?? '') === 'Cài đặt'): ?>
    <script src="<?= e(url('/assets/js/settings-autosave.js?v=20260804-4')) ?>"></script>
  <?php endif; ?>
  <?php if (($title ?? '') === 'Tiếp nhận'): ?>
    <script src="<?= e(url('/assets/js/contacts.js?v=20260804-2')) ?>"></script>
  <?php endif; ?>
</body>
</html>
