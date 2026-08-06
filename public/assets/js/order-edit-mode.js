(function () {
  const form = document.querySelector('[data-order-create][data-order-editing="1"]');
  if (!form) return;

  const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const code = form.dataset.editOrderCode || 'Đơn đang xử lý';

  function totalFromForm() {
    let count = 0;
    let total = 0;
    form.querySelectorAll('[data-menu-card]').forEach((card) => {
      const quantity = Math.max(0, parseInt(card.querySelector('.qty-input')?.value || '0', 10) || 0);
      if (quantity <= 0) return;
      count += quantity;
      total += quantity * (parseInt(card.dataset.price || '0', 10) || 0);
    });
    return { count, total };
  }

  function refreshHeader() {
    const activeCode = form.querySelector('[data-active-draft-code]');
    const activeInfo = form.querySelector('[data-active-draft-info]');
    const syncStatus = form.querySelector('[data-draft-sync-status]');
    const name = form.querySelector('[name="customer_name"]')?.value.trim() || 'Chưa nhập tên';
    const summary = totalFromForm();

    if (activeCode) activeCode.textContent = code;
    if (activeInfo) activeInfo.textContent = `${name} | ${summary.count} món | ${money(summary.total)}`;
    if (syncStatus) syncStatus.textContent = 'Đang sửa đơn cũ. Lưu sửa để giữ Đang xử lý, Copy gửi CN để gửi lại.';
  }

  form.addEventListener('input', () => window.requestAnimationFrame(refreshHeader), true);
  form.addEventListener('change', () => window.requestAnimationFrame(refreshHeader), true);
  form.addEventListener('click', () => window.requestAnimationFrame(refreshHeader), true);
  window.setTimeout(refreshHeader, 0);
  window.setTimeout(refreshHeader, 80);
})();
