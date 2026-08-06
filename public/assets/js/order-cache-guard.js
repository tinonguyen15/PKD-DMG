(function () {
  const dirtyOrderIds = new Set();

  function currentOrderId(form) {
    return String(form?.dataset.currentOrderId || form?.querySelector('[data-edit-order-id]')?.value || '');
  }

  function markDirty(event) {
    const form = event.target?.closest?.('[data-order-create]');
    if (!form || form.dataset.workspaceApplying === '1') return;
    const id = currentOrderId(form);
    if (id) dirtyOrderIds.add(id);
  }

  function orderIdFromCard(card) {
    return String(card?.dataset.orderId || '');
  }

  function forceFreshForDirtyCard(event) {
    const card = event.target?.closest?.('[data-open-order-card].is-processing');
    if (!card || event.target.closest('a, button, input, textarea, select, form')) return;

    const id = orderIdFromCard(card);
    if (!id || !dirtyOrderIds.has(id)) return;

    // order-open-orders.js có cache riêng trong closure. Đổi tạm data-order-id trong đúng 1 tick
    // để handler cũ bỏ qua cache/inflight cũ và gọi lại API edit-data mới nhất.
    card.dataset.orderId = `${id}__fresh__${Date.now()}`;
    window.setTimeout(() => {
      card.dataset.orderId = id;
    }, 0);
  }

  document.addEventListener('input', markDirty, true);
  document.addEventListener('change', markDirty, true);
  document.addEventListener('click', forceFreshForDirtyCard, true);
  document.addEventListener('order-workspace:loaded', (event) => {
    const id = String(event.detail?.order?.id || currentOrderId(event.target));
    if (id) dirtyOrderIds.delete(id);
  }, true);
})();
