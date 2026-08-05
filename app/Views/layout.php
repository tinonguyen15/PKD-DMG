<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="app-version" content="<?= e(app_version()) ?>">
  <title><?= e($title ?? config('app.name')) ?> - <?= e(config('app.name')) ?></title>
  <link rel="stylesheet" href="<?= e(asset_url('/assets/css/app.css')) ?>">
  <link rel="stylesheet" href="<?= e(asset_url('/assets/css/sidebar.css')) ?>">
  <link rel="stylesheet" href="<?= e(asset_url('/assets/css/brand-assets.css')) ?>">
  <link rel="stylesheet" href="<?= e(asset_url('/assets/css/info-pages.css')) ?>">
  <?php if (($title ?? '') === 'Tạo đơn'): ?>
    <link rel="stylesheet" href="<?= e(asset_url('/assets/css/customer-insights.css')) ?>">
    <link rel="stylesheet" href="<?= e(asset_url('/assets/css/order-create.css')) ?>">
  <?php endif; ?>
  <?php if (($title ?? '') === 'Blacklist'): ?>
    <link rel="stylesheet" href="<?= e(asset_url('/assets/css/customer-blacklist.css')) ?>">
  <?php endif; ?>
  <link rel="stylesheet" href="<?= e(asset_url('/assets/css/layout-fixes.css')) ?>">
</head>
<body class="<?= e(($title ?? '') === 'Tạo đơn' ? 'page-order-create' : '') ?>">
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

    $currentUri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
    $currentPath = parse_url($currentUri, PHP_URL_PATH) ?: '/';
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

    $isInfoActive = static function (string $key) use ($currentPath, $currentUri): bool {
        if ($currentPath !== '/info.php') {
            return false;
        }
        if ($key === 'branches') {
            return !str_contains($currentUri, 'page=') && !str_contains($currentUri, 'custom=') || str_contains($currentUri, 'page=branches');
        }
        return str_contains($currentUri, $key);
    };

    $infoItems = [
        ['href' => '/info.php?page=branches', 'icon' => '⌖', 'label' => 'Địa chỉ CN', 'desc' => 'Dùng chung', 'active' => $isInfoActive('branches')],
        ['href' => '/info.php?page=bank-accounts', 'icon' => '₫', 'label' => 'STK CN', 'desc' => 'Dùng chung', 'active' => $isInfoActive('bank-accounts')],
        ['href' => '/info.php?page=menu', 'icon' => '☰', 'label' => 'Menu', 'desc' => 'Dùng chung', 'active' => $isInfoActive('menu')],
    ];
    foreach (\App\Models\InfoPageModel::sidebarCustomTabs((int) ($user['id'] ?? 0)) as $index => $tab) {
        $infoItems[] = [
            'href' => '/info.php?custom=' . $index,
            'icon' => '•',
            'label' => $tab['title'],
            'desc' => 'Riêng của tôi',
            'active' => $isInfoActive('custom=' . $index),
        ];
    }

    $navGroups = [
        [
            'label' => 'Menu',
            'items' => [
                ['href' => '/orders/create', 'icon' => '+', 'label' => 'Tạo đơn', 'desc' => '', 'active' => $isNavActive('/orders/create')],
                ['href' => '/orders', 'icon' => '▦', 'label' => 'Đơn hàng', 'desc' => '', 'active' => $isNavActive('/orders', true, ['/orders/create'])],
                ['href' => '/contacts', 'icon' => '☏', 'label' => 'Tiếp nhận', 'desc' => '', 'active' => $isNavActive('/contacts')],
                ['href' => '/customers/blacklist', 'icon' => '!', 'label' => 'Blacklist', 'desc' => '', 'active' => $isNavActive('/customers/blacklist')],
                ['href' => '/reports', 'icon' => '◴', 'label' => 'Báo cáo', 'desc' => '', 'active' => $isNavActive('/reports')],
            ],
        ],
        [
            'label' => 'Thông tin',
            'items' => $infoItems,
        ],
        [
            'label' => 'Khác',
            'items' => [
                ['href' => '/', 'icon' => '⌂', 'label' => 'Tổng quan', 'desc' => '', 'active' => $isNavActive('/', false)],
                ['href' => '/profile/settings', 'icon' => '⚙', 'label' => 'Cá nhân', 'desc' => '', 'active' => $isNavActive('/profile/settings')],
            ],
        ],
    ];

    if (is_admin()) {
        $navGroups[2]['items'][] = ['href' => '/settings', 'icon' => '✦', 'label' => 'Cài đặt', 'desc' => '', 'active' => $isNavActive('/settings')];
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
                  <?php if (!empty($item['desc'])): ?>
                    <small><?= e($item['desc']) ?></small>
                  <?php endif; ?>
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
        <small class="app-version">v<?= e(app_version()) ?></small>
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
  <script src="<?= e(asset_url('/assets/js/app.js')) ?>"></script>
  <script src="<?= e(asset_url('/assets/js/customer-copy-cleanup.js')) ?>"></script>
  <?php if (($title ?? '') === 'Tạo đơn'): ?>
    <script src="<?= e(asset_url('/assets/js/customer-insights.js')) ?>"></script>
    <script src="<?= e(asset_url('/assets/js/branch-copy-cleanup.js')) ?>"></script>
  <?php endif; ?>
  <?php if (($title ?? '') === 'Cài đặt'): ?>
    <script src="<?= e(asset_url('/assets/js/settings-autosave.js')) ?>"></script>
  <?php endif; ?>
  <?php if (($title ?? '') === 'Tiếp nhận'): ?>
    <script src="<?= e(asset_url('/assets/js/contacts.js')) ?>"></script>
  <?php endif; ?>
</body>
</html>
