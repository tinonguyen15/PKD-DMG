<?php
require __DIR__ . '/_nav.php';
$renderSimpleCatalog = function (string $title, string $catalog, array $rows): void {
    ?>
    <details class="panel settings-panel" open>
      <summary><?= e($title) ?></summary>
      <form class="inline-form" method="post" action="<?= e(url('/settings/catalog')) ?>">
        <?= csrf_field() ?>
        <input type="hidden" name="catalog" value="<?= e($catalog) ?>">
        <?php if ($catalog === 'menu_categories'): ?><input name="slug" placeholder="slug"><?php endif; ?>
        <input name="name" placeholder="Tên" required>
        <input type="number" name="sort_order" placeholder="Thứ tự" value="0">
        <label class="check"><input type="checkbox" name="active" value="1" checked> Bật</label>
        <button class="btn primary" type="submit">Thêm</button>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><?php if ($catalog === 'menu_categories'): ?><th>Slug</th><?php endif; ?><th>Tên</th><th>Thứ tự</th><th>Bật</th><th>Lưu</th></tr></thead>
          <tbody>
            <?php foreach ($rows as $row): ?>
              <tr>
                <form method="post" action="<?= e(url('/settings/catalog')) ?>">
                  <?= csrf_field() ?>
                  <input type="hidden" name="catalog" value="<?= e($catalog) ?>">
                  <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
                  <td><?= (int) $row['id'] ?></td>
                  <?php if ($catalog === 'menu_categories'): ?><td><input name="slug" value="<?= e($row['slug']) ?>"></td><?php endif; ?>
                  <td><input name="name" value="<?= e($row['name']) ?>" required></td>
                  <td><input type="number" name="sort_order" value="<?= (int) $row['sort_order'] ?>"></td>
                  <td><input type="checkbox" name="active" value="1" <?= (int) $row['active'] === 1 ? 'checked' : '' ?>></td>
                  <td><button class="btn ghost" type="submit">Lưu</button></td>
                </form>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </details>
    <?php
};
?>

<section class="settings-page-panel">
  <p class="settings-page-note">Các danh mục cơ bản dùng trong màn tạo đơn và báo cáo.</p>
  <section class="content-grid two">
    <?php $renderSimpleCatalog('Danh mục món', 'menu_categories', $categories); ?>
    <?php $renderSimpleCatalog('Nguồn đơn', 'order_sources', $sources); ?>
    <?php $renderSimpleCatalog('Thanh toán', 'payment_methods', $payments); ?>
    <?php $renderSimpleCatalog('Trạng thái đơn', 'order_statuses', $statuses); ?>
  </section>
</section>
