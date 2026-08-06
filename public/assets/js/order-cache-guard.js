(function () {
  const dirtyOrderIds = new Set();

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function currentOrderId(form) {
    return String(form?.dataset.currentOrderId || form?.querySelector('[data-edit-order-id]')?.value || '');
  }

  function selectedValue(form, name) {
    return form.querySelector(`[name="${name}"]:checked`)?.value || form.querySelector(`[name="${name}"]`)?.value || '';
  }

  function cleanPhone(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function toast(message) {
    const root = $('#toast-root');
    if (!root) {
      window.alert(message);
      return;
    }
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    root.appendChild(node);
    window.setTimeout(() => node.remove(), 2600);
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

  function cleanBranchCopyText(text) {
    return String(text || '')
      .replace(/^ĐƠN MANG VỀ\s*-\s*Done(?:\s*-\s*(?:CK|COD))?\s*$/m, 'ĐƠN MANG VỀ')
      .replace(/^ĐƠN GHÉ LẤY\s*-\s*Done(?:\s*-\s*(?:CK|COD))?\s*$/m, 'ĐƠN GHÉ LẤY')
      .split('\n')
      .filter((line) => !/^\s*•\s*Thanh toán\s*:/i.test(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function cleanPreviewBox() {
    const preview = $('[data-order-preview]');
    if (!preview) return;
    const cleaned = cleanBranchCopyText(preview.value);
    if (cleaned && preview.value !== cleaned) preview.value = cleaned;
  }

  function selectedItems(form) {
    return $$('[name^="items["]', form)
      .map((input) => Math.max(0, parseInt(input.value || '0', 10) || 0))
      .reduce((sum, qty) => sum + qty, 0);
  }

  function validateBeforeClose(form) {
    const type = selectedValue(form, 'order_type') || 'delivery';
    const name = String(form.querySelector('[name="customer_name"]')?.value || '').trim();
    const phone = cleanPhone(form.querySelector('[name="phone"]')?.value || '');
    const address = String(form.querySelector('[name="address"]')?.value || '').trim();
    const branchId = parseInt(form.querySelector('[name="branch_id"]')?.value || '0', 10) || 0;
    const itemCount = selectedItems(form);
    const errors = [];

    if (type === 'delivery') {
      if (!name) errors.push('Tên khách');
      if (!/^\d{10}$/.test(phone)) errors.push('SĐT đúng 10 số');
      if (!address) errors.push('Địa chỉ');
      if (itemCount <= 0) errors.push('Món ăn');
    } else if (type === 'pickup') {
      if (!name) errors.push('Tên khách');
      if (branchId <= 0) errors.push('Chi nhánh');
      if (itemCount <= 0) errors.push('Món ăn');
    } else if (type === 'booking') {
      if (!name) errors.push('Tên khách');
      if (branchId <= 0) errors.push('Chi nhánh');
      if ((parseInt(form.querySelector('[name="guest_count"]')?.value || '0', 10) || 0) <= 0) errors.push('Số lượng khách');
      if (!String(form.querySelector('[name="receive_time"]')?.value || '').trim()) errors.push('Thời gian');
    }

    if (errors.length) {
      toast(`Thiếu thông tin bắt buộc: ${errors.join(', ')}.`);
      return false;
    }
    return true;
  }

  async function autosaveCurrent(form) {
    const id = currentOrderId(form);
    if (!id) throw new Error('Chưa chọn đơn để xử lý.');

    const formData = new FormData(form);
    formData.set('edit_order_id', id);
    formData.set('submit_status', 'processing');

    const response = await fetch(`/orders/${id}/autosave`, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.saved) {
      throw new Error(payload.message || 'Không tự lưu được đơn trước khi xử lý.');
    }
    dirtyOrderIds.delete(id);
    return payload;
  }

  async function copyText(text) {
    const cleaned = cleanBranchCopyText(text);
    await navigator.clipboard.writeText(cleaned);
    toast('Đã copy');
  }

  async function postStatus(orderId, status) {
    const formData = new FormData();
    const csrf = document.querySelector('input[name="_csrf"]');
    if (csrf) formData.append('_csrf', csrf.value);
    formData.append('workflow_status', status);

    const response = await fetch(`/orders/${orderId}/status`, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!response.ok) throw new Error('Không chuyển được trạng thái đơn.');
  }

  function interceptCopyOrComplete(event) {
    const copyButton = event.target.closest('[data-copy-preview][data-submit-status-after-copy]');
    const completeButton = event.target.closest('[data-order-create] .primary-actions button[type="submit"]');
    if (!copyButton && !completeButton) return;

    const form = event.target.closest('[data-order-create]');
    if (!form) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!validateBeforeClose(form)) return;

    const orderId = currentOrderId(form);
    if (!orderId) {
      toast('Chưa chọn đơn để xử lý.');
      return;
    }

    (async () => {
      try {
        await autosaveCurrent(form);
        cleanPreviewBox();

        if (copyButton) {
          const preview = $('[data-order-preview]', form);
          await copyText(preview ? preview.value : '');
          await postStatus(orderId, copyButton.dataset.submitStatusAfterCopy || 'sent');
          window.location.href = `/orders/create?edit_order_id=${orderId}`;
          return;
        }

        await postStatus(orderId, 'completed');
        window.location.href = '/orders?workflow_status=completed';
      } catch (error) {
        toast(error.message || 'Không xử lý được đơn.');
      }
    })();
  }

  document.addEventListener('input', (event) => {
    markDirty(event);
    if (event.target?.closest?.('[data-order-create]')) {
      window.requestAnimationFrame(cleanPreviewBox);
    }
  }, true);
  document.addEventListener('change', (event) => {
    markDirty(event);
    if (event.target?.closest?.('[data-order-create]')) {
      window.requestAnimationFrame(cleanPreviewBox);
    }
  }, true);
  document.addEventListener('click', forceFreshForDirtyCard, true);
  document.addEventListener('click', interceptCopyOrComplete, true);
  document.addEventListener('order-workspace:loaded', (event) => {
    const id = String(event.detail?.order?.id || currentOrderId(event.target));
    if (id) dirtyOrderIds.delete(id);
    window.requestAnimationFrame(cleanPreviewBox);
  }, true);
  window.requestAnimationFrame(cleanPreviewBox);
})();
