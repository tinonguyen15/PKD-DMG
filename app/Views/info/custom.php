<section class="panel info-page">
  <div class="section-head">
    <div>
      <h2><?= e($tab['title']) ?></h2>
      <p class="muted small">Tab thông tin riêng của tài khoản này.</p>
    </div>
  </div>

  <article class="custom-info-content">
    <?= nl2br(e($tab['content'] ?: 'Chưa nhập nội dung cho tab này.')) ?>
  </article>
</section>
