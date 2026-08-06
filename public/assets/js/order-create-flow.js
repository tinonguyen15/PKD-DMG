(function () {
  const form = document.querySelector('[data-order-create]');
  const newOrderForm = document.querySelector('[data-new-processing-form]');
  if (!form || !newOrderForm) return;

  function currentOrderId() {
    return parseInt(form.dataset.currentOrderId || form.querySelector('[data-edit-order-id]')?.value || '0', 10) || 0;
  }

  function processingCardCount() {
    return document.querySelectorAll('[data-open-order-card].is-processing').length;
  }

  function setStatus(text, tone) {
    const node = document.querySelector('[data-draft-sync-status]');
    if (!node) return;
    node.textContent = text;
    node.dataset.autosaveTone = tone || '';
  }

  async function createBlankProcessingOrder() {
    const response = await fetch(newOrderForm.action, {
      method: 'POST',
      body: new FormData(newOrderForm),
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.order?.id) {
      throw new Error(payload.message || 'Không tạo được đơn trống.');
    }
    return payload.order;
  }

  async function ensureBlankProcessingOrder() {
    if (currentOrderId() > 0) return;
    if (processingCardCount() > 0) return;
    if (newOrderForm.dataset.autoCreating === '1') return;

    newOrderForm.dataset.autoCreating = '1';
    setStatus('Đang tạo sẵn đơn trống để nhập thông tin...', 'saving');

    try {
      const order = await createBlankProcessingOrder();
      window.location.replace(`/orders/create?edit_order_id=${encodeURIComponent(order.id)}`);
    } catch (error) {
      newOrderForm.dataset.autoCreating = '';
      setStatus(error.message || 'Không tạo được đơn trống.', 'error');
    }
  }

  window.setTimeout(ensureBlankProcessingOrder, 220);
})();
