<section class="panel info-page">
  <div class="section-head">
    <div>
      <h2>Địa chỉ chi nhánh</h2>
      <p class="muted small">Danh sách dùng chung cho toàn hệ thống.</p>
    </div>
  </div>

  <div class="info-card-grid">
    <?php foreach ($branches as $branch): ?>
      <article class="info-card <?= !empty($branch['active']) ? '' : 'is-muted' ?>">
        <div class="info-card-head">
          <strong><?= e($branch['name']) ?></strong>
          <span class="pill <?= !empty($branch['active']) ? 'completed' : 'cancelled' ?>"><?= !empty($branch['active']) ? 'Đang hoạt động' : 'Tạm tắt' ?></span>
        </div>
        <p><?= e($branch['address'] ?: 'Chưa nhập địa chỉ') ?></p>
        <?php if (!empty($branch['phone'])): ?>
          <small>Điện thoại: <?= e($branch['phone']) ?></small>
        <?php endif; ?>
      </article>
    <?php endforeach; ?>
    <?php if (!$branches): ?>
      <p class="empty">Chưa có chi nhánh.</p>
    <?php endif; ?>
  </div>
</section>
