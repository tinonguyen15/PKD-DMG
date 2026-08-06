(function () {
  const form = document.querySelector('[data-order-create][data-order-editing="1"]');
  if (!form) return;

  const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const editInput = form.querySelector('[data-edit-order-id]');
  const orderId = parseInt(editInput?.value || '0', 10) || 0;
  const code = form.dataset.editOrderCode || 'Đơn đang xử lý';
  const autosaveUrl = orderId > 0 ? `/orders/${orderId}/autosave` : '';
  const statusNode = form.querySelector('[data-draft-sync-status]');
  let autosaveTimer = null;
  let autosaveStatus = 'Đang sửa đơn cũ. Thay đổi sẽ tự lưu.';
  let lastSignature = '';
  let isSaving = false;
  let isSubmitting = false;
  let queuedWhileSaving = false;

  function setStatus(text, tone) {
    autosaveStatus = text;
    if (statusNode) {
      statusNode.textContent = text;
      statusNode.dataset.autosaveTone = tone || '';
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
    const activeCode = form.querySelector('[data-active-draft-code]');
    const activeInfo = form.querySelector('[data-active-draft-info]');
    const syncStatus = form.querySelector('[data-draft-sync-status]');
    const name = form.querySelector('[name="customer_name"]')?.value.trim() || 'Chưa nhập tên';
    const summary = totalFromForm();

    if (activeCode) activeCode.textContent = code;
    if (activeInfo) activeInfo.textContent = `${name} | ${summary.count} món | ${money(summary.total)}`;
    if (syncStatus) syncStatus.textContent = autosaveStatus;
  }

  function removeManualSaveButton() {
    const actions = form.querySelector('.primary-actions');
    if (!actions) return;
    Array.from(actions.querySelectorAll('button')).forEach((button) => {
      if ((button.textContent || '').trim().toLowerCase() === 'lưu sửa') {
        button.remove();
      }
    });
  }

  function formSignature() {
    const data = new FormData(form);
    data.delete('submit_status');
    data.delete('draft_id');
    const entries = [];
    data.forEach((value, key) => entries.push([key, String(value)]));
    entries.sort((a, b) => a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0]));
    return JSON.stringify(entries);
  }

  async function autosaveNow({ quiet = false } = {}) {
    if (!autosaveUrl || isSubmitting) return false;

    const signature = formSignature();
    if (signature === lastSignature && !quiet) return true;
    lastSignature = signature;

    if (isSaving) {
      queuedWhileSaving = true;
      return false;
    }

    isSaving = true;
    if (!quiet) setStatus('Đang tự lưu...', 'saving');

    const formData = new FormData(form);
    formData.set('edit_order_id', String(orderId));
    formData.set('submit_status', 'processing');

    try {
      const response = await fetch(autosaveUrl, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.saved) {
        throw new Error(payload.message || 'Không tự lưu được đơn.');
      }

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
      if (queuedWhileSaving && !isSubmitting) {
        queuedWhileSaving = false;
        window.setTimeout(() => autosaveNow(), 120);
      }
    }
  }

  function queueAutosave() {
    if (!autosaveUrl || isSubmitting) return;
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
    if (!link || !form.contains(document.activeElement) && !form.contains(link) && !link.closest('.open-order-list')) return;
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || link.target === '_blank' || link.dataset.noEditAutosave === '1') return;

    if (autosaveTimer) clearTimeout(autosaveTimer);
    event.preventDefault();
    await autosaveNow({ quiet: true });
    window.location.href = link.href;
  }

  function sendBeaconAutosave() {
    if (!autosaveUrl || isSubmitting) return;
    try {
      const data = new FormData(form);
      data.set('edit_order_id', String(orderId));
      data.set('submit_status', 'processing');
      navigator.sendBeacon?.(autosaveUrl, data);
    } catch (error) {
      // Best-effort only. Normal autosave already handles most changes.
    }
  }

  form.addEventListener('input', (event) => {
    if (shouldAutosaveEventTarget(event.target)) queueAutosave();
  }, true);

  form.addEventListener('change', (event) => {
    if (shouldAutosaveEventTarget(event.target)) queueAutosave();
  }, true);

  form.addEventListener('click', (event) => {
    window.requestAnimationFrame(refreshHeader);
    if (shouldAutosaveEventTarget(event.target)) {
      window.setTimeout(queueAutosave, 80);
    }
  }, true);

  form.addEventListener('submit', () => {
    isSubmitting = true;
    if (autosaveTimer) clearTimeout(autosaveTimer);
  });

  document.addEventListener('click', saveBeforeNavigation, true);
  window.addEventListener('beforeunload', sendBeaconAutosave);

  removeManualSaveButton();
  lastSignature = formSignature();
  refreshHeader();
  setStatus('Đang sửa đơn cũ. Thay đổi sẽ tự lưu.', 'idle');
  window.setTimeout(refreshHeader, 0);
  window.setTimeout(refreshHeader, 80);
})();
