<?php
$personalMenu = $personalMenu ?? \App\Models\PersonalMenuModel::DEFAULTS;
$personalItems = is_array($personalMenu['personal_menu_items'] ?? null) ? $personalMenu['personal_menu_items'] : [];
$showFavorites = !empty($personalMenu['personal_menu_show_favorites']);
$favoriteMenuItemIds = array_map('intval', (array) ($preferenceValues['favorite_menu_item_ids'] ?? []));
$showRecent = !empty($preferenceValues['show_recent_menu_items_first']);
?>

<details class="preference-group personal-menu-settings" open>
  <summary>
    <span>Menu món cá nhân</span>
    <small>Tự đổi tên, ảnh, thứ tự, ẩn/hiện, ghim và gần đây cho riêng tài khoản này</small>
  </summary>
  <div class="preference-group-body">
    <p class="preference-hint wide">
      Các chỉnh sửa ở đây chỉ áp dụng cho màn tạo đơn của nhân viên này. Menu tổng trong Cài đặt hệ thống không bị thay đổi.
    </p>

    <div class="setting-row wide personal-menu-toggles">
      <label class="check">
        <input type="checkbox" name="personal_menu_show_favorites" value="1" <?= $showFavorites ? 'checked' : '' ?>>
        Bật khu vực món ghim
      </label>
      <label class="check">
        <input type="checkbox" name="show_recent_menu_items_first" value="1" <?= $showRecent ? 'checked' : '' ?><?= $disabled('show_recent_menu_items_first') ?>>
        Bật món gần đây
      </label>
    </div>

    <div class="personal-menu-table-wrap wide">
      <table class="personal-menu-table">
        <thead>
          <tr>
            <th>Món gốc</th>
            <th>Ghim</th>
            <th>Thứ tự</th>
            <th>Tên hiển thị</th>
            <th>Tên gửi CN</th>
            <th>Tên gửi KH</th>
            <th>Ảnh riêng</th>
            <th>Ẩn</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($items as $item): ?>
            <?php
              $id = (int) $item['id'];
              $custom = $personalItems[(string) $id] ?? [];
            ?>
            <tr>
              <td class="personal-menu-origin">
                <strong><?= e($item['name']) ?></strong>
                <small><?= e($item['category_name'] ?? '') ?> · <?= money((int) $item['price']) ?></small>
              </td>
              <td>
                <label class="check compact-check">
                  <input type="checkbox" name="favorite_menu_item_ids[]" value="<?= $id ?>" <?= in_array($id, $favoriteMenuItemIds, true) ? 'checked' : '' ?><?= $disabled('favorite_menu_item_ids') ?>>
                  Ghim
                </label>
              </td>
              <td>
                <input class="mini-input" type="number" min="0" name="personal_menu_items[<?= $id ?>][sort_order]" value="<?= e($custom['sort_order'] ?? '') ?>" placeholder="0">
              </td>
              <td>
                <input name="personal_menu_items[<?= $id ?>][name]" value="<?= e($custom['name'] ?? '') ?>" placeholder="Để trống = tên gốc">
              </td>
              <td>
                <input name="personal_menu_items[<?= $id ?>][branch_name]" value="<?= e($custom['branch_name'] ?? '') ?>" placeholder="Tên gửi chi nhánh">
              </td>
              <td>
                <input name="personal_menu_items[<?= $id ?>][customer_name]" value="<?= e($custom['customer_name'] ?? '') ?>" placeholder="Tên gửi khách">
              </td>
              <td>
                <input name="personal_menu_items[<?= $id ?>][image_path]" value="<?= e($custom['image_path'] ?? '') ?>" placeholder="/assets/images/... hoặc https://...">
              </td>
              <td>
                <label class="check compact-check danger-check">
                  <input type="checkbox" name="personal_menu_items[<?= $id ?>][hidden]" value="1" <?= !empty($custom['hidden']) ? 'checked' : '' ?>>
                  Ẩn
                </label>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</details>
