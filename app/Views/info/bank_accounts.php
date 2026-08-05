<section class="panel info-page">
  <div class="section-head">
    <div>
      <h2>STK chi nhánh</h2>
      <p class="muted small">Thông tin tài khoản dùng chung cho nhân viên tra cứu nhanh.</p>
    </div>
  </div>

  <div class="info-card-grid">
    <?php foreach ($branches as $branch): ?>
      <?php $bank = $bankAccounts[(int) $branch['id']] ?? null; ?>
      <article class="info-card <?= $bank ? '' : 'is-muted' ?>">
        <div class="info-card-head">
          <strong><?= e($branch['name']) ?></strong>
          <span class="pill <?= $bank ? 'completed' : 'processing' ?>"><?= $bank ? 'Có STK' : 'Chưa cấu hình' ?></span>
        </div>
        <?php if ($bank): ?>
          <dl class="info-mini-list">
            <div><dt>Ngân hàng</dt><dd><?= e($bank['bank_name'] ?: '-') ?></dd></div>
            <div><dt>Số tài khoản</dt><dd><?= e($bank['account_number'] ?: '-') ?></dd></div>
            <div><dt>Chủ tài khoản</dt><dd><?= e($bank['account_name'] ?: '-') ?></dd></div>
          </dl>
          <?php if (!empty($bank['note'])): ?>
            <p class="muted small"><?= e($bank['note']) ?></p>
          <?php endif; ?>
        <?php else: ?>
          <p>Chưa có STK cho chi nhánh này.</p>
        <?php endif; ?>
      </article>
    <?php endforeach; ?>
    <?php if (!$branches): ?>
      <p class="empty">Chưa có chi nhánh.</p>
    <?php endif; ?>
  </div>
</section>
