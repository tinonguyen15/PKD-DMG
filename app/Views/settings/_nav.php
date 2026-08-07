<?php
$settingSections = $settingSections ?? [];
$activeSection = $activeSection ?? '';
?>
<style>
  .settings-hub-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.settings-hub-head h1{margin:0;font-size:26px}.settings-hub-head p{margin:6px 0 0;color:#667085}.settings-nav{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}.settings-nav .btn.is-active{background:#111827;color:#fff;border-color:#111827}.settings-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.settings-card{display:block;text-decoration:none;color:inherit;border:1px solid #e4e7ec;border-radius:18px;background:#fff;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.05);transition:.16s ease}.settings-card:hover{transform:translateY(-1px);border-color:#9ca3af;box-shadow:0 16px 34px rgba(15,23,42,.08)}.settings-card strong{display:block;font-size:17px;margin-bottom:6px}.settings-card span{display:block;color:#667085;line-height:1.45}.settings-section-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.settings-page-panel{margin-top:0}.settings-page-panel summary{cursor:pointer}.settings-page-note{color:#667085;margin:0 0 14px}.wide-form textarea,.settings-panel textarea{min-width:260px}
</style>

<div class="settings-hub-head">
  <div>
    <h1><?= e($title ?? 'Cài đặt') ?></h1>
    <p><?= $activeSection === '' ? 'Chọn đúng khu vực cần chỉnh, không còn phải kéo một trang dài toàn bộ cài đặt.' : 'Mỗi khu vực cài đặt nằm ở một trang riêng để dễ nhìn và dễ thao tác hơn.' ?></p>
  </div>
  <div class="settings-section-actions">
    <a class="btn ghost" href="<?= e(url('/settings')) ?>">Tất cả mục</a>
    <a class="btn ghost" href="<?= e(url('/settings/all')) ?>">Trang cũ</a>
  </div>
</div>

<?php if ($settingSections): ?>
  <nav class="settings-nav" aria-label="Chuyên mục cài đặt">
    <?php foreach ($settingSections as $key => $section): ?>
      <a class="btn ghost <?= $activeSection === $key ? 'is-active' : '' ?>" href="<?= e(url($section['url'])) ?>"><?= e($section['label']) ?></a>
    <?php endforeach; ?>
  </nav>
<?php endif; ?>
