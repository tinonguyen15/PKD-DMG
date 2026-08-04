<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($title ?? config('app.name')) ?></title>
  <link rel="stylesheet" href="<?= e(url('/assets/css/app.css')) ?>">
  <link rel="stylesheet" href="<?= e(url('/assets/css/login.css?v=20260805-1')) ?>">
</head>
<body class="auth-body login-auth-body">
  <?= $content ?>
</body>
</html>
