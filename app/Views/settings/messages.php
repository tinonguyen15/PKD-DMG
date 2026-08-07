<?php require __DIR__ . '/_nav.php'; ?>

<section class="panel settings-panel settings-page-panel">
  <div class="section-head"><div><h2>Tin nhắn mẫu</h2><p class="settings-page-note">Quản lý mẫu tin nhắn để sale copy nhanh khi trao đổi với khách.</p></div></div>
  <form class="stack" method="post" action="<?= e(url('/settings/catalog')) ?>">
    <?= csrf_field() ?>
    <input type="hidden" name="catalog" value="message_templates">
    <div class="form-grid">
      <label>Danh mục
        <select name="category_id">
          <?php foreach ($messageCategories as $category): ?><option value="<?= (int) $category['id'] ?>"><?= e($category['name']) ?></option><?php endforeach; ?>
        </select>
      </label>
      <label>Tiêu đề <input name="title" required></label>
      <label>Thứ tự <input type="number" name="sort_order" value="0"></label>
      <label class="check"><input type="checkbox" name="is_pinned" value="1"> Ghim</label>
      <label class="check"><input type="checkbox" name="active" value="1" checked> Bật</label>
      <label class="wide">Nội dung <textarea name="content" rows="4" required></textarea></label>
      <label class="wide">Từ khóa <input name="keywords"></label>
    </div>
    <button class="btn primary" type="submit">Thêm mẫu</button>
  </form>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Danh mục</th><th>Tiêu đề</th><th>Nội dung</th><th>Ghim</th><th>Bật</th><th>Thứ tự</th><th>Từ khóa</th><th>Lưu</th></tr></thead>
      <tbody>
        <?php foreach ($messageTemplates as $row): ?>
          <tr>
            <form method="post" action="<?= e(url('/settings/catalog')) ?>">
              <?= csrf_field() ?>
              <input type="hidden" name="catalog" value="message_templates">
              <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
              <td><select name="category_id"><?php foreach ($messageCategories as $category): ?><option value="<?= (int) $category['id'] ?>" <?= (int) $row['category_id'] === (int) $category['id'] ? 'selected' : '' ?>><?= e($category['name']) ?></option><?php endforeach; ?></select></td>
              <td><input name="title" value="<?= e($row['title']) ?>"></td>
              <td><textarea name="content" rows="3"><?= e($row['content']) ?></textarea></td>
              <td><input type="checkbox" name="is_pinned" value="1" <?= (int) $row['is_pinned'] === 1 ? 'checked' : '' ?>></td>
              <td><input type="checkbox" name="active" value="1" <?= (int) $row['active'] === 1 ? 'checked' : '' ?>></td>
              <td><input type="number" name="sort_order" value="<?= (int) $row['sort_order'] ?>"></td>
              <td><input name="keywords" value="<?= e($row['keywords']) ?>"></td>
              <td><button class="btn ghost" type="submit">Lưu</button></td>
            </form>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</section>
