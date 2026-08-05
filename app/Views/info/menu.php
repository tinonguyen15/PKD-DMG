<section class="panel info-page">
  <div class="section-head">
    <div>
      <h2>Menu dùng chung</h2>
      <p class="muted small">Menu gốc của hệ thống, không phải menu cá nhân đã tùy chỉnh.</p>
    </div>
  </div>

  <?php foreach ($categories as $category): ?>
    <?php $categoryItems = array_values(array_filter($items, static fn(array $item): bool => (int) $item['category_id'] === (int) $category['id'])); ?>
    <?php if (!$categoryItems) continue; ?>
    <section class="info-menu-section">
      <h3><?= e($category['name']) ?></h3>
      <div class="info-menu-grid">
        <?php foreach ($categoryItems as $item): ?>
          <article class="info-menu-item <?= !empty($item['active']) ? '' : 'is-muted' ?>">
            <?php if (!empty($item['image_path'])): ?>
              <img src="<?= e($item['image_path']) ?>" alt="<?= e($item['name']) ?>">
            <?php endif; ?>
            <div>
              <strong><?= e($item['name']) ?></strong>
              <small><?= e($item['branch_name'] ?: $item['name']) ?></small>
              <b><?= money((int) $item['price']) ?></b>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    </section>
  <?php endforeach; ?>
</section>
