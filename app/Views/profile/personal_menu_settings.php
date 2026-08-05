<?php
$personalMenu = $personalMenu ?? \App\Models\PersonalMenuModel::DEFAULTS;
$personalItems = is_array($personalMenu['personal_menu_items'] ?? null) ? $personalMenu['personal_menu_items'] : [];
$showFavorites = !empty($personalMenu['personal_menu_show_favorites']);
$favoriteMenuItemIds = array_map('intval', (array) ($preferenceValues['favorite_menu_item_ids'] ?? []));
$displayItems = array_values($items);
foreach ($displayItems as $index => &$displayItem) {
    $id = (int) ($displayItem['id'] ?? 0);
    $custom = $personalItems[(string) $id] ?? [];
    $sort = max(0, (int) ($custom['sort_order'] ?? 0));
    $displayItem['_personal_edit_sort'] = $sort > 0 ? $sort : 100000 + $index;
    $displayItem['_personal_original_index'] = $index;
}
unset($displayItem);
usort($displayItems, static function (array $a, array $b): int {
    $sort = ((int) ($a['_personal_edit_sort'] ?? 0)) <=> ((int) ($b['_personal_edit_sort'] ?? 0));
    return $sort !== 0 ? $sort : ((int) ($a['_personal_original_index'] ?? 0) <=> (int) ($b['_personal_original_index'] ?? 0));
});
?>

<details class="preference-group personal-menu-settings" open data-personal-menu-settings>
  <summary>
    <span>Menu món cá nhân</span>
    <small>Kéo thả, đổi tên, ảnh, ẩn/hiện và ghim món cho riêng tài khoản này</small>
  </summary>
  <div class="preference-group-body">
    <p class="preference-hint wide">
      Kéo món theo thứ tự từ trên xuống. Các chỉnh sửa ở đây chỉ áp dụng cho màn tạo đơn của nhân viên này, không đổi menu tổng.
    </p>

    <div class="setting-row wide personal-menu-toggles">
      <label class="check">
        <input type="checkbox" name="personal_menu_show_favorites" value="1" <?= $showFavorites ? 'checked' : '' ?>>
        Bật khu vực món ghim
      </label>
      <span class="autosave-status" data-profile-autosave-status>Đã sẵn sàng tự lưu</span>
    </div>

    <div class="personal-menu-table-wrap wide">
      <table class="personal-menu-table">
        <thead>
          <tr>
            <th class="drag-col">Kéo</th>
            <th>Món gốc</th>
            <th>Ghim</th>
            <th>Tên hiển thị</th>
            <th>Tên gửi CN</th>
            <th>Tên gửi KH</th>
            <th>Ảnh riêng</th>
            <th>Ẩn</th>
          </tr>
        </thead>
        <tbody data-personal-menu-sortable>
          <?php foreach ($displayItems as $rowIndex => $item): ?>
            <?php
              $id = (int) $item['id'];
              $custom = $personalItems[(string) $id] ?? [];
              $sortValue = max(0, (int) ($custom['sort_order'] ?? 0));
              if ($sortValue <= 0) {
                  $sortValue = ($rowIndex + 1) * 10;
              }
            ?>
            <tr data-personal-menu-row data-menu-item-id="<?= $id ?>">
              <td class="drag-col">
                <button class="drag-handle" type="button" data-drag-handle aria-label="Kéo để sắp xếp">☰</button>
                <input type="hidden" data-sort-input name="personal_menu_items[<?= $id ?>][sort_order]" value="<?= (int) $sortValue ?>">
              </td>
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
