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
      Khóa cấu hình này
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
    ['enabled' => 'copy_branch_notice_bank_transfer_enabled', 'text' => 'copy_branch_notice_bank_transfer', 'label' => 'Chuyển khoản / cần bill'],
    ['enabled' => 'copy_branch_notice_default_enabled', 'text' => 'copy_branch_notice_default', 'label' => 'Lưu ý chung'],
    ['enabled' => 'copy_branch_notice_cod_enabled', 'text' => 'copy_branch_notice_cod', 'label' => 'Đơn COD'],
    ['enabled' => 'copy_branch_notice_scheduled_enabled', 'text' => 'copy_branch_notice_scheduled', 'label' => 'Đơn hẹn giờ'],
];
$quickNotices = [
    'copy_branch_quick_notice_paid_ck' => 'Khách đã CK',
    'copy_branch_quick_notice_call_before_delivery' => 'Gọi trước khi giao',
    'copy_branch_quick_notice_urgent' => 'Khách lấy gấp',
    'copy_branch_quick_notice_invoice' => 'Cần hóa đơn',
];
$copyTemplates = [
    'delivery' => [
        'label' => 'Đơn mang về',
        'description' => 'Dùng cho đơn giao đi hoặc ship ngoài.',
        'branch' => ['key' => 'copy_template_delivery_branch', 'label' => 'Mẫu gửi chi nhánh'],
        'customer' => ['key' => 'copy_template_delivery_customer', 'label' => 'Mẫu gửi khách hàng'],
    ],
    'pickup' => [
        'label' => 'Đơn ghé lấy',
        'description' => 'Dùng cho khách tự ghé chi nhánh lấy đơn.',
        'branch' => ['key' => 'copy_template_pickup_branch', 'label' => 'Mẫu gửi chi nhánh'],
        'customer' => ['key' => 'copy_template_pickup_customer', 'label' => 'Mẫu gửi khách hàng'],
    ],
    'booking' => [
        'label' => 'Đơn đặt bàn',
        'description' => 'Dùng khi khách đặt bàn tại chi nhánh.',
        'branch' => ['key' => 'copy_template_booking_branch', 'label' => 'Mẫu gửi chi nhánh'],
        'customer' => ['key' => 'copy_template_booking_customer', 'label' => 'Mẫu gửi khách hàng'],
    ],
];
$templateVariables = [
    ['token' => '{customer_name}', 'name' => 'Tên khách', 'example' => 'Nguyễn Văn A', 'note' => 'Lấy từ ô Tên khách.'],
    ['token' => '{phone}', 'name' => 'Số điện thoại', 'example' => '0901234567', 'note' => 'Lấy từ ô Số điện thoại.'],
    ['token' => '{address}', 'name' => 'Địa chỉ giao', 'example' => '12 Nguyễn Huệ, Q1', 'note' => 'Chủ yếu dùng cho đơn mang về.'],
    ['token' => '{branch}', 'name' => 'Chi nhánh', 'example' => 'CN Thủ Đức', 'note' => 'Chi nhánh sale chọn trong đơn.'],
    ['token' => '{items}', 'name' => 'Danh sách món', 'example' => '  1 Lẩu nhỏ', 'note' => 'Tự xuống dòng theo từng món.'],
    ['token' => '{total_line}', 'name' => 'Dòng tổng tiền', 'example' => '=> Tổng tiền: 199.000đ', 'note' => 'Bật/tắt bằng công tắc bên dưới.'],
    ['token' => '{total}', 'name' => 'Tổng bill', 'example' => '199.000đ', 'note' => 'Chỉ giá trị tiền, không có nhãn.'],
    ['token' => '{delivery_time}', 'name' => 'Thời gian giao', 'example' => 'Giao ngay', 'note' => 'Bỏ trống sẽ tự hiện Giao ngay.'],
    ['token' => '{pickup_time}', 'name' => 'Thời gian ghé lấy', 'example' => '18:30', 'note' => 'Bỏ trống sẽ hiện Chưa nhập.'],
    ['token' => '{receive_time}', 'name' => 'Thời gian nhận', 'example' => 'Giao ngay / 18:30', 'note' => 'Tự theo loại đơn.'],
    ['token' => '{payment}', 'name' => 'Thanh toán', 'example' => 'Chuyển khoản', 'note' => 'Hình thức thanh toán đang chọn.'],
    ['token' => '{branch_footer}', 'name' => 'Lưu ý + tag @', 'example' => '⚠ Lưu ý...\n@CN', 'note' => 'Gồm lưu ý nhanh, lưu ý điều kiện và tag.'],
    ['token' => '{guest_count}', 'name' => 'Số lượng khách', 'example' => '4', 'note' => 'Dùng cho đơn đặt bàn.'],
    ['token' => '{note}', 'name' => 'Ghi chú', 'example' => 'Ít cay, phòng lạnh', 'note' => 'Ghi chú đơn / đặt bàn.'],
];
$renderTemplateTextarea = function (string $key, string $label) use ($preferenceValues, $disabled, $lockControl, $lockedNote): void {
    ?>
    <div class="template-editor-card">
      <div class="template-editor-head">
        <strong><?= e($label) ?></strong>
        <?php $lockControl($key); ?>
      </div>
      <?php $lockedNote($key); ?>
      <textarea name="<?= e($key) ?>" rows="9" spellcheck="false"<?= $disabled($key) ?>><?= e($preferenceValues[$key] ?? '') ?></textarea>
    </div>
    <?php
};
?>

<div class="preference-grid compact system-preference-layout">
  <section class="preference-hero">
    <div>
      <span class="settings-kicker">PKD ĐMG Settings</span>
      <h2>Mẫu copy & vận hành tạo đơn</h2>
      <p>Thiết kế nội dung gửi chi nhánh, gửi khách hàng và các mặc định khi sale tạo đơn. Các mẫu dưới đây là mẫu đang dùng trực tiếp trên màn tạo đơn.</p>
    </div>
    <div class="settings-hero-stats">
      <span>6 mẫu copy</span>
      <span>14 biến động</span>
      <span>Có khóa cấu hình</span>
    </div>
  </section>

  <section class="settings-block copy-template-workbench" id="copy-template-workbench">
    <div class="settings-block-head">
      <div>
        <span class="settings-kicker">Mẫu copy đơn hàng</span>
        <h3>Thiết kế mẫu gửi CN / gửi KH</h3>
        <p>Sửa chữ, xuống dòng, thêm/bớt biến theo nhu cầu. Những biến không có dữ liệu sẽ tự để trống hoặc dùng giá trị mặc định.</p>
      </div>
    </div>

    <div class="template-toolbar">
      <div class="template-toggle-card">
        <label class="check"><input type="checkbox" name="copy_branch_show_item_price" value="1" <?= $checked('copy_branch_show_item_price') ?><?= $disabled('copy_branch_show_item_price') ?>> Gửi CN: hiện giá sau từng món</label>
        <?php $lockControl('copy_branch_show_item_price'); $lockedNote('copy_branch_show_item_price'); ?>
      </div>
      <div class="template-toggle-card">
        <label class="check"><input type="checkbox" name="copy_branch_show_total" value="1" <?= $checked('copy_branch_show_total') ?><?= $disabled('copy_branch_show_total') ?>> Gửi CN: hiện dòng tổng tiền</label>
        <?php $lockControl('copy_branch_show_total'); $lockedNote('copy_branch_show_total'); ?>
      </div>
      <div class="template-toggle-card">
        <label class="check"><input type="checkbox" name="copy_customer_show_item_price" value="1" <?= $checked('copy_customer_show_item_price') ?><?= $disabled('copy_customer_show_item_price') ?>> Gửi KH: hiện giá sau từng món</label>
        <?php $lockControl('copy_customer_show_item_price'); $lockedNote('copy_customer_show_item_price'); ?>
      </div>
      <div class="template-toggle-card">
        <label class="check"><input type="checkbox" name="copy_customer_show_total" value="1" <?= $checked('copy_customer_show_total') ?><?= $disabled('copy_customer_show_total') ?>> Gửi KH: hiện dòng tổng bill</label>
        <?php $lockControl('copy_customer_show_total'); $lockedNote('copy_customer_show_total'); ?>
      </div>
    </div>

    <div class="template-workspace-grid">
      <div class="template-editors">
        <?php foreach ($copyTemplates as $group): ?>
          <details class="copy-template-section" open>
            <summary>
              <span><?= e($group['label']) ?></span>
              <small><?= e($group['description']) ?></small>
            </summary>
            <div class="template-editor-grid">
              <?php $renderTemplateTextarea($group['branch']['key'], $group['branch']['label']); ?>
              <?php $renderTemplateTextarea($group['customer']['key'], $group['customer']['label']); ?>
            </div>
          </details>
        <?php endforeach; ?>
      </div>

      <aside class="template-variable-panel" aria-label="Bảng dịch biến mẫu">
        <div class="variable-panel-head">
          <span class="settings-kicker">Bảng dịch biến</span>
          <h4>Biến Tiếng Việt dễ dùng</h4>
          <p>Copy biến ở cột trái rồi dán vào mẫu. Không đổi dấu ngoặc nhọn <code>{ }</code>.</p>
        </div>
        <div class="variable-list">
          <?php foreach ($templateVariables as $variable): ?>
            <article class="variable-item">
              <code><?= e($variable['token']) ?></code>
              <div>
                <strong><?= e($variable['name']) ?></strong>
                <span><?= e($variable['note']) ?></span>
                <em>Ví dụ: <?= e($variable['example']) ?></em>
              </div>
            </article>
          <?php endforeach; ?>
        </div>
      </aside>
    </div>
  </section>

  <section class="settings-block">
    <div class="settings-block-head">
      <div>
        <span class="settings-kicker">Gửi chi nhánh</span>
        <h3>Lưu ý nhanh, lưu ý điều kiện và tag @</h3>
        <p>Những dòng này sẽ được gom vào biến <code>{branch_footer}</code> trong mẫu gửi chi nhánh.</p>
      </div>
      <label class="check strong-check">
        <input type="checkbox" name="auto_mark_sent_on_branch_copy" value="1" <?= $checked('auto_mark_sent_on_branch_copy') ?><?= $disabled('auto_mark_sent_on_branch_copy') ?>>
        Tự chuyển Đã gửi CN sau khi bấm Copy gửi CN
      </label>
      <?php $lockControl('auto_mark_sent_on_branch_copy'); $lockedNote('auto_mark_sent_on_branch_copy'); ?>
    </div>

    <div class="conditional-notice-grid">
      <?php foreach ($conditionalNotices as $notice): ?>
        <div class="notice-card">
          <div class="template-head">
            <label class="check">
              <input type="checkbox" name="<?= e($notice['enabled']) ?>" value="1" <?= $checked($notice['enabled']) ?><?= $disabled($notice['enabled']) ?>>
              <?= e($notice['label']) ?>
            </label>
            <?php $lockControl($notice['enabled']); ?>
          </div>
          <?php $lockedNote($notice['enabled']); ?>
          <label>Nội dung lưu ý
            <textarea name="<?= e($notice['text']) ?>" rows="3"<?= $disabled($notice['text']) ?>><?= e($preferenceValues[$notice['text']] ?? '') ?></textarea>
          </label>
          <?php $lockControl($notice['text']); $lockedNote($notice['text']); ?>
        </div>
      <?php endforeach; ?>
    </div>

    <div class="settings-two-column">
      <div class="settings-mini-panel">
        <h4>Tag mặc định</h4>
        <label>Tag dùng chung
          <input name="copy_branch_tag_text" value="<?= e($preferenceValues['copy_branch_tag_text'] ?? '') ?>" placeholder="@PKD"<?= $disabled('copy_branch_tag_text') ?>>
        </label>
        <?php $lockControl('copy_branch_tag_text'); $lockedNote('copy_branch_tag_text'); ?>
        <label class="check">
          <input type="checkbox" name="copy_branch_include_tag" value="1" <?= $checked('copy_branch_include_tag') ?><?= $disabled('copy_branch_include_tag') ?>>
          Bật tag @ trong mẫu gửi CN
        </label>
        <?php $lockControl('copy_branch_include_tag'); $lockedNote('copy_branch_include_tag'); ?>
        <label class="check">
          <input type="checkbox" name="copy_branch_tag_require_branch_match" value="1" <?= $checked('copy_branch_tag_require_branch_match') ?><?= $disabled('copy_branch_tag_require_branch_match') ?>>
          Chỉ tag khi đã chọn chi nhánh
        </label>
        <?php $lockControl('copy_branch_tag_require_branch_match'); $lockedNote('copy_branch_tag_require_branch_match'); ?>
      </div>

      <div class="settings-mini-panel">
        <h4>Tag riêng theo chi nhánh</h4>
        <div class="branch-tag-grid">
          <?php foreach ($branches as $branch): ?>
            <label><?= e($branch['name']) ?>
              <input name="copy_branch_tag_by_branch[<?= (int) $branch['id'] ?>]" value="<?= e($branchTagValues[(string) $branch['id']] ?? '') ?>" placeholder="@<?= e($branch['name']) ?>"<?= $disabled('copy_branch_tag_by_branch') ?>>
            </label>
          <?php endforeach; ?>
        </div>
        <?php $lockControl('copy_branch_tag_by_branch'); $lockedNote('copy_branch_tag_by_branch'); ?>
      </div>
    </div>

    <div class="settings-mini-panel wide">
      <h4>Mẫu lưu ý nhanh</h4>
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
  </section>

  <section class="settings-block">
    <div class="settings-block-head">
      <div>
        <span class="settings-kicker">Tạo đơn nhanh</span>
        <h3>Mặc định khi mở màn tạo đơn</h3>
        <p>Các lựa chọn mặc định giúp sale vào là nhập đơn ngay, giảm thao tác thừa.</p>
      </div>
    </div>
    <div class="settings-form-grid">
      <label>Mặc định mở tab loại đơn
        <select name="default_order_type"<?= $disabled('default_order_type') ?>>
          <?php foreach ($typeLabels as $key => $label): ?>
            <option value="<?= e($key) ?>" <?= ($preferenceValues['default_order_type'] ?? 'delivery') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <?php $lockControl('default_order_type'); $lockedNote('default_order_type'); ?>

      <label>Chi nhánh mặc định
        <select name="default_branch_id"<?= $disabled('default_branch_id') ?>>
          <option value="0">Không chọn sẵn</option>
          <?php foreach ($branches as $branch): ?>
            <option value="<?= (int) $branch['id'] ?>" <?= (int) ($preferenceValues['default_branch_id'] ?? 0) === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <?php $lockControl('default_branch_id'); $lockedNote('default_branch_id'); ?>

      <label>Nguồn mặc định
        <select name="default_source_id"<?= $disabled('default_source_id') ?>>
          <option value="0">Không chọn sẵn</option>
          <?php foreach ($sources as $source): ?>
            <option value="<?= (int) $source['id'] ?>" <?= (int) ($preferenceValues['default_source_id'] ?? 0) === (int) $source['id'] ? 'selected' : '' ?>><?= e($source['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <?php $lockControl('default_source_id'); $lockedNote('default_source_id'); ?>

      <label>Thanh toán mang về
        <select name="default_delivery_payment_method_id"<?= $disabled('default_delivery_payment_method_id') ?>>
          <option value="0">Theo danh sách đầu tiên</option>
          <?php foreach ($payments as $payment): ?>
            <option value="<?= (int) $payment['id'] ?>" <?= (int) ($preferenceValues['default_delivery_payment_method_id'] ?? 0) === (int) $payment['id'] ? 'selected' : '' ?>><?= e($payment['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <?php $lockControl('default_delivery_payment_method_id'); $lockedNote('default_delivery_payment_method_id'); ?>

      <label>Thanh toán ghé lấy
        <select name="default_pickup_payment_method_id"<?= $disabled('default_pickup_payment_method_id') ?>>
          <option value="0">Theo danh sách đầu tiên</option>
          <?php foreach ($payments as $payment): ?>
            <option value="<?= (int) $payment['id'] ?>" <?= (int) ($preferenceValues['default_pickup_payment_method_id'] ?? 0) === (int) $payment['id'] ? 'selected' : '' ?>><?= e($payment['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <?php $lockControl('default_pickup_payment_method_id'); $lockedNote('default_pickup_payment_method_id'); ?>

      <label class="check setting-card-check">
        <input type="checkbox" name="remember_last_order_choices" value="1" <?= $checked('remember_last_order_choices') ?><?= $disabled('remember_last_order_choices') ?>>
        Ghi nhớ lựa chọn gần nhất của nhân viên
      </label>
      <?php $lockControl('remember_last_order_choices'); $lockedNote('remember_last_order_choices'); ?>
    </div>
  </section>

  <section class="settings-block">
    <div class="settings-block-head">
      <div>
        <span class="settings-kicker">Món ghim & gần đây</span>
        <h3>Ưu tiên món hay bán trên màn tạo đơn</h3>
        <p>Giúp sale bấm món nhanh hơn khi menu dài.</p>
      </div>
      <label class="check strong-check">
        <input type="checkbox" name="show_recent_menu_items_first" value="1" <?= $checked('show_recent_menu_items_first') ?><?= $disabled('show_recent_menu_items_first') ?>>
        Đưa món bán gần đây lên sau món ghim
      </label>
      <?php $lockControl('show_recent_menu_items_first'); $lockedNote('show_recent_menu_items_first'); ?>
    </div>
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
  </section>

  <section class="settings-block">
    <div class="settings-block-head">
      <div>
        <span class="settings-kicker">Gửi khách</span>
        <h3>Câu mở/kết phụ trợ</h3>
        <p>Dùng cho các nơi còn gọi mẫu xác nhận cũ. Mẫu copy mới nên ưu tiên chỉnh ở khu Mẫu copy đơn hàng phía trên.</p>
      </div>
    </div>
    <div class="settings-two-column">
      <label>Câu xác nhận đầu mẫu
        <textarea name="customer_confirmation_intro" rows="3" placeholder="Ví dụ: Dạ em xác nhận lại thông tin đơn của mình như sau ạ."<?= $disabled('customer_confirmation_intro') ?>><?= e($preferenceValues['customer_confirmation_intro'] ?? '') ?></textarea>
      </label>
      <?php $lockControl('customer_confirmation_intro'); $lockedNote('customer_confirmation_intro'); ?>
      <label>Câu kết cuối mẫu
        <textarea name="customer_confirmation_footer" rows="3" placeholder="Ví dụ: Dạ anh/chị kiểm tra giúp em, nếu cần chỉnh thông tin báo em ngay nhé."<?= $disabled('customer_confirmation_footer') ?>><?= e($preferenceValues['customer_confirmation_footer'] ?? '') ?></textarea>
      </label>
      <?php $lockControl('customer_confirmation_footer'); $lockedNote('customer_confirmation_footer'); ?>
    </div>
  </section>

  <section class="settings-block">
    <div class="settings-block-head">
      <div>
        <span class="settings-kicker">Tiếp cận & Báo cáo</span>
        <h3>Mặc định cho thống kê và tiếp nhận</h3>
      </div>
    </div>
    <div class="settings-form-grid">
      <label>Chi nhánh tiếp cận mặc định
        <select name="default_contact_branch_id"<?= $disabled('default_contact_branch_id') ?>>
          <option value="0">Không chọn sẵn</option>
          <?php foreach ($branches as $branch): ?>
            <option value="<?= (int) $branch['id'] ?>" <?= (int) ($preferenceValues['default_contact_branch_id'] ?? 0) === (int) $branch['id'] ? 'selected' : '' ?>><?= e($branch['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <?php $lockControl('default_contact_branch_id'); $lockedNote('default_contact_branch_id'); ?>

      <label>Kênh tiếp cận mặc định
        <select name="default_contact_channel"<?= $disabled('default_contact_channel') ?>>
          <?php foreach ($channels as $key => $label): ?>
            <option value="<?= e($key) ?>" <?= ($preferenceValues['default_contact_channel'] ?? 'hotline_1900') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <?php $lockControl('default_contact_channel'); $lockedNote('default_contact_channel'); ?>

      <label>Khoảng ngày báo cáo
        <select name="default_report_range"<?= $disabled('default_report_range') ?>>
          <?php foreach ($reportRanges as $key => $label): ?>
            <option value="<?= e($key) ?>" <?= ($preferenceValues['default_report_range'] ?? 'today') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <?php $lockControl('default_report_range'); $lockedNote('default_report_range'); ?>
    </div>
  </section>
</div>
