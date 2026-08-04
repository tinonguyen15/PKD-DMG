<?php
$preferenceValues = $preferenceValues ?? [];
$preferenceLocks = $preferenceLocks ?? [];
$branches = $branches ?? [];
$sources = $sources ?? [];
$payments = $payments ?? [];
$items = $items ?? [];
$channels = $channels ?? [];
$typeLabels = $typeLabels ?? [];
$reportRanges = $reportRanges ?? [];
$preferenceLockControls = !empty($preferenceLockControls);
$preferenceDisableLocked = !empty($preferenceDisableLocked);
$isLocked = fn(string $key): bool => !empty($preferenceLocks[$key]);
$disabled = fn(string $key): string => $preferenceDisableLocked && $isLocked($key) ? ' disabled' : '';
$checked = fn(string $key): string => !empty($preferenceValues[$key]) ? ' checked' : '';
$lockControl = function (string $key) use ($preferenceLockControls, $isLocked): void {
    if (!$preferenceLockControls) {
        return;
    }
    ?>
    <label class="check setting-lock">
      <input type="checkbox" name="locked_keys[]" value="<?= e($key) ?>" <?= $isLocked($key) ? 'checked' : '' ?>>
      Khóa
    </label>
    <?php
};
$lockedNote = function (string $key) use ($preferenceDisableLocked, $isLocked): void {
    if ($preferenceDisableLocked && $isLocked($key)) {
        ?><small class="field-note">Đang bị khóa theo cài đặt hệ thống.</small><?php
    }
};
$branchTagValues = is_array($preferenceValues['copy_branch_tag_by_branch'] ?? null) ? $preferenceValues['copy_branch_tag_by_branch'] : [];
$favoriteMenuItemIds = array_map('intval', (array) ($preferenceValues['favorite_menu_item_ids'] ?? []));
$conditionalNotices = [
    ['enabled' => 'copy_branch_notice_bank_transfer_enabled', 'text' => 'copy_branch_notice_bank_transfer', 'label' => 'Chuyển khoản/Bill'],
    ['enabled' => 'copy_branch_notice_default_enabled', 'text' => 'copy_branch_notice_default', 'label' => 'Mẫu chung'],
    ['enabled' => 'copy_branch_notice_cod_enabled', 'text' => 'copy_branch_notice_cod', 'label' => 'COD'],
    ['enabled' => 'copy_branch_notice_scheduled_enabled', 'text' => 'copy_branch_notice_scheduled', 'label' => 'Hẹn giờ giao'],
];
$quickNotices = [
    'copy_branch_quick_notice_paid_ck' => 'Khách đã CK',
    'copy_branch_quick_notice_call_before_delivery' => 'Gọi trước khi giao',
    'copy_branch_quick_notice_urgent' => 'Khách lấy gấp',
    'copy_branch_quick_notice_invoice' => 'Cần hóa đơn',
];
?>

<div class="preference-grid compact">
  <details class="preference-group" open>
    <summary><span>Copy gửi CN</span><small>Lưu ý theo điều kiện, lưu ý nhanh và tag Zalo</small></summary>
    <div class="preference-group-body">
      <p class="preference-hint wide">Mẫu điều kiện chỉ thêm khi ô bật và có nội dung. Tag Zalo dùng theo ô có giá trị: tag riêng chi nhánh ưu tiên hơn tag mặc định.</p>

      <?php foreach ($conditionalNotices as $notice): ?>
        <div class="preference-template">
          <div class="template-head">
            <label class="check">
              <input type="checkbox" name="<?= e($notice['enabled']) ?>" value="1" <?= $checked($notice['enabled']) ?><?= $disabled($notice['enabled']) ?>>
              <?= e($notice['label']) ?>
            </label>
            <?php $lockControl($notice['enabled']); ?>
          </div>
          <?php $lockedNote($notice['enabled']); ?>
          <label>Nội dung
            <textarea name="<?= e($notice['text']) ?>" rows="2"<?= $disabled($notice['text']) ?>><?= e($preferenceValues[$notice['text']] ?? '') ?></textarea>
          </label>
          <?php $lockControl($notice['text']); $lockedNote($notice['text']); ?>
        </div>
      <?php endforeach; ?>

      <div class="setting-row wide">
        <label class="check">
          <input type="checkbox" name="auto_mark_sent_on_branch_copy" value="1" <?= $checked('auto_mark_sent_on_branch_copy') ?><?= $disabled('auto_mark_sent_on_branch_copy') ?>>
          Tự chuyển Đã gửi CN sau khi bấm Copy gửi CN
        </label>
        <?php $lockControl('auto_mark_sent_on_branch_copy'); $lockedNote('auto_mark_sent_on_branch_copy'); ?>
      </div>

      <div class="setting-row">
        <label>Tag mặc định
          <input name="copy_branch_tag_text" value="<?= e($preferenceValues['copy_branch_tag_text'] ?? '') ?>" placeholder="@PKD"<?= $disabled('copy_branch_tag_text') ?>>
        </label>
        <?php $lockControl('copy_branch_tag_text'); $lockedNote('copy_branch_tag_text'); ?>
      </div>

      <div class="setting-row wide">
        <div class="branch-tag-block">
          <strong>Tag riêng theo chi nhánh</strong>
          <div class="branch-tag-grid">
            <?php foreach ($branches as $branch): ?>
              <label><?= e($branch['name']) ?>
                <input name="copy_branch_tag_by_branch[<?= (int) $branch['id'] ?>]" value="<?= e($branchTagValues[(string) $branch['id']] ?? '') ?>" placeholder="@<?= e($branch['name']) ?>"<?= $disabled('copy_branch_tag_by_branch') ?>>
              </label>
            <?php endforeach; ?>
          </div>
        </div>
        <?php $lockControl('copy_branch_tag_by_branch'); $lockedNote('copy_branch_tag_by_branch'); ?>
      </div>

      <div class="setting-row wide">
        <div class="branch-tag-block">
          <strong>Mẫu lưu ý nhanh</strong>
          <p class="preference-hint">Nhân viên chọn các mẫu này ngay trên màn tạo đơn. Để trống mẫu nào thì mẫu đó không hiện ở màn tạo đơn.</p>
          <div class="quick-template-grid">
            <?php foreach ($quickNotices as $key => $label): ?>
              <label><?= e($label) ?>
                <textarea name="<?= e($key) ?>" rows="2"<?= $disabled($key) ?>><?= e($preferenceValues[$key] ?? '') ?></textarea>
              </label>
              <?php $lockControl($key); $lockedNote($key); ?>
            <?php endforeach; ?>
          </div>
        </div>
      </div>
    </div>
  </details>

  <details class="preference-group" open>
    <summary><span>Tạo đơn nhanh</span><small>Mở đúng loại đơn và điền sẵn các lựa chọn thường dùng</small></summary>
    <div class="preference-group-body">
      <div class="setting-row">
        <label>Mặc định mở tab loại đơn
          <select name="default_order_type"<?= $disabled('default_order_type') ?>>
            <?php foreach ($typeLabels as $key => $label): ?>
              <option value="<?= e($key) ?>" <?= ($preferenceValues['default_order_type'] ?? 'delivery') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <?php $lockControl('default_order_type'); $lockedNote('default_order_type'); ?>
      </div>
      <div class="setting-row">
        <label>Chi nhánh mặc định
          <select name="default_branch_id"<?= $disabled('default_branch_id') ?>>
            <option value="0">Không chọn sẵn</option>
            <?php foreach ($branches as $branch): ?>
              <option value="<?= (int) $branch['id'] ?>" <?= (int) ($preferenceValues['default_branch_id'] ?? 0) === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <?php $lockControl('default_branch_id'); $lockedNote('default_branch_id'); ?>
      </div>
      <div class="setting-row">
        <label>Nguồn mặc định
          <select name="default_source_id"<?= $disabled('default_source_id') ?>>
            <option value="0">Không chọn sẵn</option>
            <?php foreach ($sources as $source): ?>
              <option value="<?= (int) $source['id'] ?>" <?= (int) ($preferenceValues['default_source_id'] ?? 0) === (int) $source['id'] ? 'selected' : '' ?>><?= e($source['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <?php $lockControl('default_source_id'); $lockedNote('default_source_id'); ?>
      </div>
      <div class="setting-row">
        <label>Thanh toán mang về
          <select name="default_delivery_payment_method_id"<?= $disabled('default_delivery_payment_method_id') ?>>
            <option value="0">Theo danh sách đầu tiên</option>
            <?php foreach ($payments as $payment): ?>
              <option value="<?= (int) $payment['id'] ?>" <?= (int) ($preferenceValues['default_delivery_payment_method_id'] ?? 0) === (int) $payment['id'] ? 'selected' : '' ?>><?= e($payment['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <?php $lockControl('default_delivery_payment_method_id'); $lockedNote('default_delivery_payment_method_id'); ?>
      </div>
      <div class="setting-row">
        <label>Thanh toán ghé lấy
          <select name="default_pickup_payment_method_id"<?= $disabled('default_pickup_payment_method_id') ?>>
            <option value="0">Theo danh sách đầu tiên</option>
            <?php foreach ($payments as $payment): ?>
              <option value="<?= (int) $payment['id'] ?>" <?= (int) ($preferenceValues['default_pickup_payment_method_id'] ?? 0) === (int) $payment['id'] ? 'selected' : '' ?>><?= e($payment['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <?php $lockControl('default_pickup_payment_method_id'); $lockedNote('default_pickup_payment_method_id'); ?>
      </div>
      <div class="setting-row">
        <label class="check">
          <input type="checkbox" name="remember_last_order_choices" value="1" <?= $checked('remember_last_order_choices') ?><?= $disabled('remember_last_order_choices') ?>>
          Ghi nhớ lựa chọn gần nhất
        </label>
        <?php $lockControl('remember_last_order_choices'); $lockedNote('remember_last_order_choices'); ?>
      </div>
    </div>
  </details>

  <details class="preference-group" open>
    <summary><span>Món ghim & gần đây</span><small>Ưu tiên món hay bán lên đầu danh sách</small></summary>
    <div class="preference-group-body">
      <div class="setting-row wide">
        <label class="check">
          <input type="checkbox" name="show_recent_menu_items_first" value="1" <?= $checked('show_recent_menu_items_first') ?><?= $disabled('show_recent_menu_items_first') ?>>
          Đưa món bán gần đây lên sau món ghim
        </label>
        <?php $lockControl('show_recent_menu_items_first'); $lockedNote('show_recent_menu_items_first'); ?>
      </div>
      <div class="setting-row wide">
        <div class="favorite-item-block">
          <strong>Ghim món lên đầu</strong>
          <div class="favorite-item-grid">
            <?php foreach ($items as $item): ?>
              <label class="check">
                <input type="checkbox" name="favorite_menu_item_ids[]" value="<?= (int) $item['id'] ?>" <?= in_array((int) $item['id'], $favoriteMenuItemIds, true) ? 'checked' : '' ?><?= $disabled('favorite_menu_item_ids') ?>>
                <span><?= e($item['name']) ?> <small><?= money((int) $item['price']) ?></small></span>
              </label>
            <?php endforeach; ?>
          </div>
        </div>
        <?php $lockControl('favorite_menu_item_ids'); $lockedNote('favorite_menu_item_ids'); ?>
      </div>
    </div>
  </details>

  <details class="preference-group">
    <summary><span>Gửi khách</span><small>Câu mở/kết theo giọng văn từng nhân viên</small></summary>
    <div class="preference-group-body">
      <div class="setting-row wide">
        <label>Câu xác nhận đầu mẫu
          <textarea name="customer_confirmation_intro" rows="2" placeholder="Ví dụ: Dạ em xác nhận lại thông tin đơn của mình như sau ạ."<?= $disabled('customer_confirmation_intro') ?>><?= e($preferenceValues['customer_confirmation_intro'] ?? '') ?></textarea>
        </label>
        <?php $lockControl('customer_confirmation_intro'); $lockedNote('customer_confirmation_intro'); ?>
      </div>
      <div class="setting-row wide">
        <label>Câu kết cuối mẫu
          <textarea name="customer_confirmation_footer" rows="2" placeholder="Ví dụ: Dạ anh/chị kiểm tra giúp em, nếu cần chỉnh thông tin báo em ngay nhé."<?= $disabled('customer_confirmation_footer') ?>><?= e($preferenceValues['customer_confirmation_footer'] ?? '') ?></textarea>
        </label>
        <?php $lockControl('customer_confirmation_footer'); $lockedNote('customer_confirmation_footer'); ?>
      </div>
    </div>
  </details>

  <details class="preference-group">
    <summary><span>Tiếp cận & Báo cáo</span><small>Giá trị mặc định khi nhập số liệu và xem báo cáo</small></summary>
    <div class="preference-group-body">
      <div class="setting-row">
        <label>Chi nhánh tiếp cận mặc định
          <select name="default_contact_branch_id"<?= $disabled('default_contact_branch_id') ?>>
            <option value="0">Không chọn sẵn</option>
            <?php foreach ($branches as $branch): ?>
              <option value="<?= (int) $branch['id'] ?>" <?= (int) ($preferenceValues['default_contact_branch_id'] ?? 0) === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <?php $lockControl('default_contact_branch_id'); $lockedNote('default_contact_branch_id'); ?>
      </div>
      <div class="setting-row">
        <label>Kênh tiếp cận mặc định
          <select name="default_contact_channel"<?= $disabled('default_contact_channel') ?>>
            <?php foreach ($channels as $key => $label): ?>
              <option value="<?= e($key) ?>" <?= ($preferenceValues['default_contact_channel'] ?? 'hotline_1900') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <?php $lockControl('default_contact_channel'); $lockedNote('default_contact_channel'); ?>
      </div>
      <div class="setting-row">
        <label>Khoảng ngày báo cáo
          <select name="default_report_range"<?= $disabled('default_report_range') ?>>
            <?php foreach ($reportRanges as $key => $label): ?>
              <option value="<?= e($key) ?>" <?= ($preferenceValues['default_report_range'] ?? 'today') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <?php $lockControl('default_report_range'); $lockedNote('default_report_range'); ?>
      </div>
    </div>
  </details>
</div>
