<?php require __DIR__ . '/_nav.php'; ?>

<section class="settings-card-grid">
  <?php foreach (($settingSections ?? []) as $key => $section): ?>
    <a class="settings-card" href="<?= e(url($section['url'])) ?>">
      <strong><?= e($section['label']) ?></strong>
      <span><?= e($section['description']) ?></span>
    </a>
  <?php endforeach; ?>
</section>
