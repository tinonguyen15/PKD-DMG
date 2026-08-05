<?php
$oldItems = $old['items'] ?? [];
$oldItemNotes = $old['item_notes'] ?? [];
$orderPreferences = $orderPreferences ?? [];
$quickNoticeLabels = $quickNoticeLabels ?? [];
$selectedQuickNotices = \App\Models\OrderModel::sanitizeQuickNoticeKeys($old['quick_notices'] ?? []);
$favoriteItemIds = array_map('intval', $favoriteItemIds ?? []);
$recentItemIds = array_map('intval', $recentItemIds ?? []);
$drafts = $drafts ?? [];
$activeOrders = $activeOrders ?? [];
$workflowLabels = $workflowLabels ?? \App\Models\OrderModel::WORKFLOW_LABELS;
$typeLabels = $typeLabels ?? \App\Models\OrderModel::TYPE_LABELS;
$selectedDraftId = (int) ($old['draft_id'] ?? 0);
$selectedType = $old['order_type'] ?? ($orderPreferences['default_order_type'] ?? 'delivery');
if (!array_key_exists($selectedType, ['delivery' => true, 'pickup' => true, 'booking' => true])) {
    $selectedType = 'delivery';
}
$selectedBranch = (int) ($old['branch_id'] ?? ($orderPreferences['default_branch_id'] ?? 0));
$sourceCandidate = (int) ($old['source_id'] ?? ($orderPreferences['default_source_id'] ?? 0));
$sourceIds = array_map('intval', array_column($sources, 'id'));
$selectedSource = in_array($sourceCandidate, $sourceIds, true) ? $sourceCandidate : (int) ($sources[0]['id'] ?? 0);
$paymentAllowedTypes = function (string $name): string {
    if (in_array($name, ['COD', 'Chuyển khoản'], true)) {
        return 'delivery';
    }
    if (in_array($name, ['Thanh toán khi ghé lấy', 'Đã thanh toán trước'], true)) {
        return 'pickup';
    }

    return '';
};
$allowedPaymentId = function (int $id, string $type) use ($payments, $paymentAllowedTypes): int {
    foreach ($payments as $payment) {
        if ((int) $payment['id'] === $id && $paymentAllowedTypes($payment['name']) === $type) {
            return $id;
        }
    }

    return 0;
};
$defaultPaymentId = function (string $type) use ($payments, $paymentAllowedTypes, $allowedPaymentId, $orderPreferences): int {
    $preferenceKey = $type === 'pickup' ? 'default_pickup_payment_method_id' : 'default_delivery_payment_method_id';
    $preferred = $allowedPaymentId((int) ($orderPreferences[$preferenceKey] ?? 0), $type);
    if ($preferred > 0) {
        return $preferred;
    }

    foreach ($payments as $payment) {
        if ($paymentAllowedTypes($payment['name']) === $type) {
            return (int) $payment['id'];
        }
    }

    return 0;
};
$selectedPaymentCandidate = (int) ($old['payment_method_id'] ?? $defaultPaymentId($selectedType));
$selectedPayment = $allowedPaymentId($selectedPaymentCandidate, $selectedType) ?: $defaultPaymentId($selectedType);
?>

<link rel="stylesheet" href="<?= e(asset_url('/assets/css/menu-card-click.css')) ?>">
<link rel="stylesheet" href="<?= e(asset_url('/assets/css/active-orders.css')) ?>">

<?php if ($errors): ?>
  <div class="alert danger">
    <?php foreach ($errors as $message): ?><div><?= e($message) ?></div><?php endforeach; ?>
  </div>
<?php endif; ?>

<script type="application/json" data-order-preferences><?= json_encode($orderPreferences, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?></script>
<script type="application/json" data-order-drafts><?= json_encode($drafts, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?></script>

<form
  class="order-layout"
  method="post"
  action="<?= e(url('/orders')) ?>"
  data-order-create
  data-draft-save-url="<?= e(url('/orders/drafts')) ?>"
  data-drafts-url="<?= e(url('/orders/drafts')) ?>"
  data-customer-lookup-url="<?= e(url('/orders/customer-lookup')) ?>"
  data-customer-blacklist-url="<?= e(url('/orders/customer-blacklist')) ?>"
  data-draft-storage-key="pkd_order_drafts_<?= (int) current_user()['id'] ?>"
>
  <?= csrf_field() ?>
  <input type="hidden" name="draft_id" value="<?= $selectedDraftId ?>" data-draft-id>
  <input type="hidden" name="submit_status" value="processing" data-submit-status>

  <section class="panel draft-panel" data-draft-panel>
    <div class="section-head">
      <div class="draft-active-summary">
        <span>Đang nhập</span>
        <strong data-active-draft-code>Nháp mới</strong>
        <p data-active-draft-info>Chưa có nội dung.</p>
        <small data-draft-sync-status>Đã sẵn sàng.</small>
      </div>
      <button class="btn primary" type="button" data-new-draft>Thêm đơn</button>
    </div>

    <div class="draft-open-strip">
      <div class="draft-strip" data-draft-list></div>

      <div class="open-order-strip" aria-label="Đơn đang mở">
        <div class="open-order-label">
          <strong>Đơn đang mở</strong>
          <a href="<?= e(url('/orders')) ?>">Đơn hàng</a>
        </div>
        <div class="open-order-list">
          <?php foreach ($activeOrders as $row): ?>
            <?php
              $status = (string) ($row['workflow_status'] ?? 'processing');
              $copyId = 'active-order-copy-' . (int) $row['id'];
              $completeFormId = 'active-order-complete-' . (int) $row['id'];
            ?>
            <article class="open-order-card <?= $status === 'sent' ? 'is-sent' : 'is-processing' ?>">
              <div class="open-order-main">
                <a href="<?= e(url('/orders/' . (int) $row['id'])) ?>"><?= e($row['order_code']) ?></a>
                <span><?= e($workflowLabels[$status] ?? $status) ?></span>
              </div>
              <div class="open-order-meta">
                <?= e($row['customer_name']) ?> - <?= e($row['phone']) ?><br>
                <?= e($row['branch_name'] ?: 'Chưa CN') ?> | <?= e($row['source_name'] ?: 'Chưa nguồn') ?>
              </div>
              <div class="open-order-bottom">
                <b><?= money((int) $row['total']) ?></b>
                <div class="open-order-actions">
                  <button
                    class="btn ghost"
                    type="button"
                    data-copy-target="#<?= e($copyId) ?>"
                    data-copy-sent-url="<?= e(url('/orders/' . (int) $row['id'] . '/copy-sent')) ?>"
                    data-copy-auto-sent="1"
                  ><?= $status === 'sent' ? 'Copy lại CN' : 'Copy gửi CN' ?></button>
                  <button class="btn complete" type="submit" form="<?= e($completeFormId) ?>">Hoàn thành</button>
                </div>
              </div>
              <textarea id="<?= e($copyId) ?>" class="active-order-copy" readonly><?= e($row['generated_text'] ?: '') ?></textarea>
            </article>
          <?php endforeach; ?>
          <?php if (!$activeOrders): ?>
            <p class="open-order-empty">Chưa có đơn đang xử lý.</p>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </section>

  <section class="panel order-form-panel">
    <div class="section-head">
      <h2>Tạo đơn</h2>
      <a class="btn ghost" href="<?= e(url('/orders')) ?>">Đơn hàng</a>
    </div>

    <div class="segmented">
      <?php foreach (['delivery' => 'Mang về', 'pickup' => 'Khách ghé lấy', 'booking' => 'Đặt bàn'] as $type => $label): ?>
        <label>
          <input type="radio" name="order_type" value="<?= e($type) ?>" <?= $selectedType === $type ? 'checked' : '' ?>>
          <span><?= e($label) ?></span>
        </label>
      <?php endforeach; ?>
    </div>

    <?php if ($quickNoticeLabels): ?>
      <div class="source-row quick-notice-row">
        <span>Lưu ý nhanh</span>
        <div class="chip-select compact">
          <?php foreach ($quickNoticeLabels as $key => $label): ?>
            <label>
              <input type="checkbox" name="quick_notices[]" value="<?= e($key) ?>" <?= in_array($key, $selectedQuickNotices, true) ? 'checked' : '' ?>>
              <span><?= e($label) ?></span>
            </label>
          <?php endforeach; ?>
        </div>
      </div>
    <?php endif; ?>

    <div class="source-row">
      <span>Nguồn đơn</span>
      <div class="chip-select">
        <?php foreach ($sources as $source): ?>
          <label>
            <input type="radio" name="source_id" value="<?= (int) $source['id'] ?>" <?= $selectedSource === (int) $source['id'] ? 'checked' : '' ?>>
            <span><?= e($source['name']) ?></span>
          </label>
        <?php endforeach; ?>
      </div>
    </div>

    <div class="form-grid order-info-grid">
      <label>Tên khách
        <input name="customer_name" value="<?= e($old['customer_name'] ?? '') ?>" required>
      </label>
      <label>Số điện thoại
        <input name="phone" value="<?= e($old['phone'] ?? '') ?>" data-customer-phone autocomplete="tel" required>
      </label>
      <label>Chi nhánh
        <select name="branch_id" data-branch-select required>
          <option value="">Chọn chi nhánh</option>
          <?php foreach ($branches as $branch): ?>
            <option value="<?= (int) $branch['id'] ?>" <?= $selectedBranch === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label data-booking-field>Số lượng khách
        <input type="number" min="1" name="guest_count" value="<?= e($old['guest_count'] ?? '') ?>" placeholder="Ví dụ: 5">
      </label>
      <label class="wide" data-address-field>Địa chỉ
        <input name="address" value="<?= e($old['address'] ?? '') ?>" placeholder="Địa chỉ giao hàng">
      </label>
      <label data-time-label>Thời gian nhận
        <input name="receive_time" value="<?= e($old['receive_time'] ?? '') ?>" placeholder="Giao ngay">
      </label>
      <label data-payment-field>Thanh toán
        <select name="payment_method_id" required>
          <?php foreach ($payments as $payment): ?>
            <?php $allowedTypes = $paymentAllowedTypes($payment['name']); ?>
            <option value="<?= (int) $payment['id'] ?>" data-allowed-types="<?= e($allowedTypes) ?>" <?= $selectedPayment === (int) $payment['id'] ? 'selected' : '' ?>><?= e($payment['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label class="wide" data-booking-note-field>Ghi chú đặt bàn
        <input name="note" value="<?= e($old['note'] ?? '') ?>" placeholder="Ví dụ: Phòng lạnh">
      </label>
    </div>

    <div class="customer-insight" data-customer-insight hidden>
      <div class="customer-insight__head">
        <div>
          <span data-customer-status>Đang tra cứu</span>
          <strong data-customer-title>Lịch sử khách hàng</strong>
        </div>
        <button class="btn ghost small-btn" type="button" data-customer-fill hidden>Dùng thông tin cũ</button>
      </div>
      <div class="customer-warning" data-customer-warning hidden></div>
      <div class="customer-metrics" data-customer-metrics></div>
      <div class="customer-last" data-customer-last></div>
      <div class="customer-orders" data-customer-orders></div>
      <div class="customer-blacklist-actions">
        <input data-customer-blacklist-reason placeholder="Lý do blacklist, ví dụ: boom hàng nhiều lần">
        <button class="btn danger" type="button" data-customer-blacklist-add>Thêm blacklist</button>
        <button class="btn ghost" type="button" data-customer-blacklist-remove hidden>Gỡ blacklist</button>
      </div>
    </div>
  </section>

  <section class="panel menu-panel" data-menu-panel>
    <div class="section-head">
      <h2>Chọn món</h2>
      <input class="search compact" data-menu-search placeholder="Tìm món">
    </div>
    <div class="chip-row">
      <button type="button" class="chip active" data-category-filter="all">Tất cả</button>
      <?php foreach ($categories as $category): ?>
        <button type="button" class="chip" data-category-filter="<?= e($category['slug']) ?>"><?= e($category['name']) ?></button>
      <?php endforeach; ?>
    </div>
    <div class="menu-grid">
      <?php foreach ($items as $item): ?>
        <?php $qty = (int) ($oldItems[$item['id']] ?? 0); ?>
        <article class="menu-card"
          data-menu-card
          data-category="<?= e($item['category_slug']) ?>"
          data-name="<?= e($item['name'] . ' ' . $item['branch_name'] . ' ' . $item['customer_name']) ?>"
          data-branch-name="<?= e($item['branch_name'] ?: $item['name']) ?>"
          data-customer-name="<?= e($item['customer_name'] ?: $item['name']) ?>"
          data-price="<?= (int) $item['price'] ?>">
          <div class="dish-thumb">
            <?php if ($item['image_path']): ?>
              <img src="<?= e(url($item['image_path'])) ?>" alt="">
            <?php else: ?>
              <span><?= e(mb_substr($item['name'], 0, 2, 'UTF-8')) ?></span>
            <?php endif; ?>
          </div>
          <div class="dish-info">
            <strong><?= e($item['name']) ?></strong>
            <span><?= money((int) $item['price']) ?> / <?= e($item['unit']) ?></span>
            <?php if (in_array((int) $item['id'], $favoriteItemIds, true)): ?>
              <em class="item-badge">Ghim</em>
            <?php elseif (in_array((int) $item['id'], $recentItemIds, true)): ?>
              <em class="item-badge">Gần đây</em>
            <?php endif; ?>
          </div>
          <div class="qty-control">
            <button type="button" data-qty-step="-1">-</button>
            <input class="qty-input" name="items[<?= (int) $item['id'] ?>]" value="<?= $qty ?>" inputmode="numeric">
            <button type="button" data-qty-step="1">+</button>
          </div>
          <label class="item-note-row" data-item-note-row>
            Ghi chú món
            <input name="item_notes[<?= (int) $item['id'] ?>]" value="<?= e($oldItemNotes[$item['id']] ?? '') ?>" placeholder="Ví dụ: ít cay, thêm rau">
          </label>
        </article>
      <?php endforeach; ?>
    </div>
  </section>

  <aside class="panel cart-panel sticky">
    <div class="section-head">
      <h2>Nội dung gửi</h2>
      <strong data-order-total>0đ</strong>
    </div>
    <textarea class="copy-box" readonly data-order-preview></textarea>
    <div class="cart-lines" data-cart-lines></div>
    <div class="primary-actions">
      <button class="btn ghost" type="button" data-copy-preview data-submit-status-after-copy="sent">Copy gửi CN</button>
      <button class="btn ghost" type="button" data-copy-customer>Copy gửi KH</button>
      <button class="btn primary" type="submit" onclick="this.form.querySelector('[data-submit-status]').value='completed'">Hoàn thành</button>
    </div>
  </aside>
</form>

<?php foreach ($activeOrders as $row): ?>
  <form id="active-order-complete-<?= (int) $row['id'] ?>" class="active-order-complete-form" method="post" action="<?= e(url('/orders/' . (int) $row['id'] . '/status')) ?>">
    <?= csrf_field() ?>
    <input type="hidden" name="workflow_status" value="completed">
  </form>
<?php endforeach; ?>

<script src="<?= e(asset_url('/assets/js/order-create-flow.js')) ?>"></script>
<script src="<?= e(asset_url('/assets/js/menu-card-click.js')) ?>"></script>