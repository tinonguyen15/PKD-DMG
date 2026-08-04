<form class="panel filter-grid" method="get" action="<?= e(url('/orders')) ?>">
  <div class="section-head wide">
    <h2>Đơn hàng</h2>
    <a class="btn primary" href="<?= e(url('/orders/create')) ?>">Tạo đơn</a>
  </div>
  <label>Từ ngày <input type="date" name="date_from" value="<?= e($filters['date_from'] ?? today()) ?>"></label>
  <label>Đến ngày <input type="date" name="date_to" value="<?= e($filters['date_to'] ?? today()) ?>"></label>
  <?php if (is_admin()): ?>
    <label>Nhân viên
      <select name="user_id">
        <option value="">Tất cả</option>
        <?php foreach ($users as $user): ?>
          <option value="<?= (int) $user['id'] ?>" <?= (int) ($filters['user_id'] ?? 0) === (int) $user['id'] ? 'selected' : '' ?>><?= e($user['employee_code'] . ' - ' . $user['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
  <?php endif; ?>
  <label>Chi nhánh
    <select name="branch_id">
      <option value="">Tất cả</option>
      <?php foreach ($branches as $branch): ?>
        <option value="<?= (int) $branch['id'] ?>" <?= (int) ($filters['branch_id'] ?? 0) === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
      <?php endforeach; ?>
    </select>
  </label>
  <label>Nguồn
    <select name="source_id">
      <option value="">Tất cả</option>
      <?php foreach ($sources as $source): ?>
        <option value="<?= (int) $source['id'] ?>" <?= (int) ($filters['source_id'] ?? 0) === (int) $source['id'] ? 'selected' : '' ?>><?= e($source['name']) ?></option>
      <?php endforeach; ?>
    </select>
  </label>
  <label>Loại đơn
    <select name="order_type">
      <option value="">Tất cả</option>
      <?php foreach ($typeLabels as $key => $label): ?>
        <option value="<?= e($key) ?>" <?= ($filters['order_type'] ?? '') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
      <?php endforeach; ?>
    </select>
  </label>
  <label>Tình trạng
    <select name="workflow_status">
      <option value="">Tất cả</option>
      <?php foreach ($workflowLabels as $key => $label): ?>
        <option value="<?= e($key) ?>" <?= ($filters['workflow_status'] ?? '') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
      <?php endforeach; ?>
    </select>
  </label>
  <label class="wide">Tìm kiếm
    <input name="q" value="<?= e($filters['q'] ?? '') ?>" placeholder="Mã đơn, tên, SĐT, ghi chú">
  </label>
  <button class="btn primary" type="submit">Lọc</button>
</form>

<section class="kanban">
  <?php foreach ($workflowLabels as $status => $label): ?>
    <?php $rows = array_values(array_filter($orders, fn($order) => $order['workflow_status'] === $status)); ?>
    <div class="kanban-column">
      <div class="kanban-head">
        <h2><?= e($label) ?></h2>
        <span><?= count($rows) ?></span>
      </div>
      <?php foreach ($rows as $order): ?>
        <article class="order-card">
          <strong><a href="<?= e(url('/orders/' . $order['id'])) ?>"><?= e($order['order_code']) ?></a></strong>
          <p><?= e($order['customer_name']) ?> - <?= e($order['phone']) ?></p>
          <div class="muted small"><?= e($order['branch_name'] ?: 'Chưa CN') ?> | <?= e($order['source_name'] ?: 'Chưa nguồn') ?> | <?= e($typeLabels[$order['order_type']] ?? $order['order_type']) ?></div>
          <div class="order-card-bottom">
            <b><?= money((int) $order['total']) ?></b>
            <form method="post" action="<?= e(url('/orders/' . $order['id'] . '/status')) ?>">
              <?= csrf_field() ?>
              <select name="workflow_status" onchange="this.form.submit()">
                <?php foreach ($workflowLabels as $key => $statusLabel): ?>
                  <option value="<?= e($key) ?>" <?= $order['workflow_status'] === $key ? 'selected' : '' ?>><?= e($statusLabel) ?></option>
                <?php endforeach; ?>
              </select>
            </form>
          </div>
        </article>
      <?php endforeach; ?>
      <?php if (!$rows): ?>
        <p class="empty">Không có đơn.</p>
      <?php endif; ?>
    </div>
  <?php endforeach; ?>
</section>
