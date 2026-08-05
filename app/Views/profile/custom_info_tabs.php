<?php
$customInfoTabs = $customInfoTabs ?? [];
$maxCustomInfoTabs = \App\Models\InfoPageModel::MAX_CUSTOM_TABS;
?>

<details class="preference-group custom-info-tabs" open>
  <summary>
    <span>Tab thông tin riêng</span>
    <small>Tạo tối đa <?= (int) $maxCustomInfoTabs ?> tab riêng trong menu Thông tin</small>
  </summary>
  <div class="preference-group-body">
    <p class="preference-hint wide">Các tab này chỉ hiện trong tài khoản đang chỉnh. Đặt tên tab, bật hiển thị và nhập nội dung cần tra cứu nhanh.</p>

    <div class="custom-info-tab-list wide">
      <?php for ($i = 0; $i < $maxCustomInfoTabs; $i++): ?>
        <?php $tab = $customInfoTabs[$i] ?? ['title' => '', 'content' => '', 'active' => false]; ?>
        <article class="custom-info-tab-card">
          <div class="custom-info-tab-head">
            <strong>Tab riêng <?= $i + 1 ?></strong>
            <label class="check compact-check">
              <input type="checkbox" name="custom_info_tabs[<?= $i ?>][active]" value="1" <?= !empty($tab['active']) ? 'checked' : '' ?>>
              Hiện ở sidebar
            </label>
          </div>
          <label>Tên tab
            <input name="custom_info_tabs[<?= $i ?>][title]" value="<?= e($tab['title'] ?? '') ?>" maxlength="40" placeholder="Ví dụ: Kịch bản tư vấn">
          </label>
          <label>Nội dung
            <textarea name="custom_info_tabs[<?= $i ?>][content]" rows="4" maxlength="5000" placeholder="Nhập nội dung ghi nhớ, checklist, kịch bản riêng..."><?= e($tab['content'] ?? '') ?></textarea>
          </label>
        </article>
      <?php endfor; ?>
    </div>
  </div>
</details>
