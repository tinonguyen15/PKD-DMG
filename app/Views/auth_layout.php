<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="app-version" content="<?= e(app_version()) ?>">
  <title><?= e($title ?? config('app.name')) ?></title>
  <link rel="stylesheet" href="<?= e(asset_url('/assets/css/app.css')) ?>">
  <link rel="stylesheet" href="<?= e(asset_url('/assets/css/login.css')) ?>">
  <link rel="stylesheet" href="<?= e(asset_url('/assets/css/font-polish.css')) ?>">
</head>
<body class="auth-body login-auth-body">
  <?= $content ?>
</body>
</html>
