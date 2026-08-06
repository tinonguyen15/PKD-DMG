(function () {
  const form = document.querySelector('[data-order-create]');
  if (!form) return;

  const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const editInput = form.querySelector('[data-edit-order-id]');
  let autosaveTimer = null;
  let autosaveStatus = 'Chọn đơn để bắt đầu làm.';
  let lastSavedSignature = '';
  let isSaving = false;
  let isSubmitting = false;
  let queuedWhileSaving = false;

  function isApplying() {
    return form.dataset.workspaceApplying === '1';
  }

  function orderId() {
    return parseInt(editInput?.value || form.dataset.currentOrderId || '0', 10) || 0;
  }

  function autosaveUrl() {
    const id = orderId();
    return id > 0 ? `/orders/${id}/autosave` : '';
  }

  function orderCode() {
    return form.dataset.editOrderCode || 'Đơn đang xử lý';
  }

  function setStatus(text, tone) {
    autosaveStatus = text;
    const syncStatus = document.querySelector('[data-draft-sync-status]');
    if (syncStatus) {
      syncStatus.textContent = text;
      syncStatus.dataset.autosaveTone = tone || '';
    }
    refreshHeader();
  }

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
    const activeCode = document.querySelector('[data-active-draft-code]');
    const activeInfo = document.querySelector('[data-active-draft-info]');
    const syncStatus = document.querySelector('[data-draft-sync-status]');
    const name = form.querySelector('[name="customer_name"]')?.value.trim() || 'Chưa nhập tên';
    const summary = totalFromForm();

    if (activeCode) activeCode.textContent = orderId() > 0 ? orderCode() : 'Chọn đơn hoặc thêm đơn mới';
    if (activeInfo) activeInfo.textContent = orderId() > 0 ? `${name} | ${summary.count} món | ${money(summary.total)}` : 'Click vào đơn Đang xử lý để làm tiếp.';
    if (syncStatus) syncStatus.textContent = autosaveStatus;
  }

  function formSignature() {
    const data = new FormData(form);
    data.delete('submit_status');
    const entries = [];
    data.forEach((value, key) => entries.push([key, String(value)]));
    entries.sort((a, b) => a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0]));
    return JSON.stringify(entries);
  }

  async function autosaveNow({ quiet = false } = {}) {
    const url = autosaveUrl();
    if (!url || isSubmitting || isApplying()) return false;

    const signature = formSignature();
    if (signature === lastSavedSignature && !quiet) return true;

    if (isSaving) {
      queuedWhileSaving = true;
      return false;
    }

    isSaving = true;
    if (!quiet) setStatus('Đang tự lưu...', 'saving');

    const formData = new FormData(form);
    formData.set('edit_order_id', String(orderId()));
    formData.set('submit_status', 'processing');

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.saved) {
        throw new Error(payload.message || 'Không tự lưu được đơn.');
      }

      lastSavedSignature = signature;
      const totalNode = form.querySelector('[data-order-total]');
      const preview = form.querySelector('[data-order-preview]');
      if (totalNode && typeof payload.total !== 'undefined') totalNode.textContent = money(payload.total);
      if (preview && payload.generated_text) preview.value = payload.generated_text;

      setStatus(`Đã tự lưu ${payload.saved_at || new Date().toLocaleTimeString('vi-VN')}`, 'saved');
      return true;
    } catch (error) {
      setStatus(error.message || 'Chưa tự lưu được, kiểm tra lại mạng.', 'error');
      return false;
    } finally {
      isSaving = false;
      if (queuedWhileSaving && !isSubmitting && !isApplying()) {
        queuedWhileSaving = false;
        window.setTimeout(() => autosaveNow(), 120);
      }
    }
  }

  function queueAutosave() {
    if (!autosaveUrl() || isSubmitting || isApplying()) return;
    refreshHeader();
    if (autosaveTimer) clearTimeout(autosaveTimer);
    setStatus('Đang chờ tự lưu...', 'pending');
    autosaveTimer = setTimeout(() => autosaveNow(), 650);
  }

  function shouldAutosaveEventTarget(target) {
    if (!target) return true;
    if (target.closest('[data-copy-preview], [data-copy-customer], [data-copy-target], .active-order-complete-form')) return false;
    return Boolean(target.closest('input, select, textarea, [data-menu-card], [data-qty-step], [data-category-filter]'));
  }

  async function saveBeforeNavigation(event) {
    const link = event.target.closest('a[href]');
    if (!link || link.closest('[data-open-order-card]')) return;
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || link.target === '_blank' || link.dataset.noEditAutosave === '1') return;
    if (!autosaveUrl() || isApplying()) return;

    if (autosaveTimer) clearTimeout(autosaveTimer);
    event.preventDefault();
    await autosaveNow({ quiet: true });
    window.location.href = link.href;
  }

  function sendBeaconAutosave() {
    const url = autosaveUrl();
    if (!url || isSubmitting || isApplying()) return;
    try {
      const data = new FormData(form);
      data.set('edit_order_id', String(orderId()));
      data.set('submit_status', 'processing');
      navigator.sendBeacon?.(url, data);
    } catch (error) {}
  }

  form.addEventListener('input', (event) => {
    if (isApplying()) return;
    if (shouldAutosaveEventTarget(event.target)) queueAutosave();
  }, true);

  form.addEventListener('change', (event) => {
    if (isApplying()) return;
    if (shouldAutosaveEventTarget(event.target)) queueAutosave();
  }, true);

  form.addEventListener('click', (event) => {
    if (isApplying()) return;
    window.requestAnimationFrame(refreshHeader);
    if (shouldAutosaveEventTarget(event.target)) window.setTimeout(queueAutosave, 80);
  }, true);

  form.addEventListener('submit', () => {
    isSubmitting = true;
    if (autosaveTimer) clearTimeout(autosaveTimer);
  });

  form.addEventListener('order-workspace:loaded', () => {
    isSubmitting = false;
    queuedWhileSaving = false;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    window.requestAnimationFrame(() => {
      lastSavedSignature = formSignature();
      setStatus('Đã mở đơn. Sửa gì hệ thống sẽ tự lưu.', 'idle');
      refreshHeader();
    });
  });

  document.addEventListener('click', saveBeforeNavigation, true);
  window.addEventListener('beforeunload', sendBeaconAutosave);

  lastSavedSignature = formSignature();
  refreshHeader();
  if (orderId() > 0) setStatus('Đã mở đơn. Sửa gì hệ thống sẽ tự lưu.', 'idle');
})();
