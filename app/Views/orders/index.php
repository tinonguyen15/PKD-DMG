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

<p class="kanban-hint">Có thể <strong>kéo đơn sang cột khác</strong> để đổi trạng thái nhanh. Dropdown trạng thái vẫn dùng bình thường.</p>

<section class="kanban" data-order-kanban>
  <?php foreach ($workflowLabels as $status => $label): ?>
    <?php $rows = array_values(array_filter($orders, fn($order) => $order['workflow_status'] === $status)); ?>
    <div class="kanban-column" data-kanban-column data-workflow-status="<?= e($status) ?>">
      <div class="kanban-head">
        <h2><?= e($label) ?></h2>
        <span data-kanban-count><?= count($rows) ?></span>
      </div>
      <div class="kanban-list" data-kanban-list>
        <?php foreach ($rows as $order): ?>
          <article
            class="order-card"
            draggable="true"
            data-order-card
            data-order-id="<?= (int) $order['id'] ?>"
            data-current-status="<?= e($order['workflow_status']) ?>"
            data-status-url="<?= e(url('/orders/' . $order['id'] . '/status')) ?>"
            title="Kéo sang cột khác để đổi trạng thái"
          >
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
      </div>
      <p class="empty kanban-empty" data-kanban-empty <?= $rows ? 'hidden' : '' ?>>Không có đơn.</p>
    </div>
  <?php endforeach; ?>
</section>
