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

  function dispatchNewOrderSubmit() {
    const event = typeof SubmitEvent === 'function'
      ? new SubmitEvent('submit', { bubbles: true, cancelable: true })
      : new Event('submit', { bubbles: true, cancelable: true });
    const handled = !newOrderForm.dispatchEvent(event);

    if (!handled) {
      if (typeof newOrderForm.requestSubmit === 'function') {
        newOrderForm.requestSubmit();
      } else {
        newOrderForm.submit();
      }
    }
  }

  function ensureBlankProcessingOrder() {
    if (currentOrderId() > 0) return;
    if (processingCardCount() > 0) return;
    if (newOrderForm.dataset.autoCreating === '1') return;

    newOrderForm.dataset.autoCreating = '1';
    setStatus('Đang tạo sẵn đơn trống để nhập thông tin...', 'saving');
    window.setTimeout(dispatchNewOrderSubmit, 80);
  }

  window.setTimeout(ensureBlankProcessingOrder, 220);
  document.addEventListener('order-workspace:loaded', () => {
    newOrderForm.dataset.autoCreating = '';
  });
})();
