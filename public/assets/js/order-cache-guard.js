(function () {
  const dirtyOrderIds = new Set();

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function injectOpenPanelWidthFix() {
    if (document.querySelector('[data-open-panel-width-fix]')) return;
    const style = document.createElement('style');
    style.dataset.openPanelWidthFix = '1';
    style.textContent = `
      @media (min-width: 1181px) {
        .order-open-panel {
          width: calc(100% - 430px) !important;
          max-width: calc(100% - 430px) !important;
          margin-right: 430px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        .order-open-panel .section-head,
        .order-open-panel .draft-open-strip,
        .order-open-panel .open-order-strip,
        .order-open-panel .open-order-label,
        .order-open-panel .open-order-list {
          min-width: 0 !important;
          max-width: 100% !important;
        }
        .order-open-panel .section-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          align-items: start !important;
        }
        .order-open-panel .draft-active-summary {
          min-width: 0 !important;
        }
        .order-open-panel [data-add-processing-order] {
          position: relative !important;
          z-index: 2 !important;
          white-space: nowrap !important;
        }
        .order-open-panel .open-order-list {
          overflow-x: auto !important;
          overflow-y: hidden !important;
          padding-right: 8px !important;
        }
      }
      @media (max-width: 1180px) {
        .order-open-panel {
          width: 100% !important;
          max-width: 100% !important;
          margin-right: 0 !important;
        }
      }
      [data-order-create] .order-inline-error {
        display: block;
        margin-top: 6px;
        color: #d92d20;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.35;
      }
      [data-order-create] label.order-field-invalid > input,
      [data-order-create] label.order-field-invalid > select,
      [data-order-create] label.order-field-invalid > textarea,
      [data-order-create] .order-field-invalid input,
      [data-order-create] .order-field-invalid select,
      [data-order-create] .order-field-invalid textarea {
        border-color: #f04438 !important;
        box-shadow: 0 0 0 3px rgba(240, 68, 56, .12) !important;
      }
      [data-order-create] .menu-panel.order-field-invalid {
        border-color: #f04438 !important;
        box-shadow: 0 0 0 3px rgba(240, 68, 56, .08), 0 12px 26px rgba(15, 23, 42, .05) !important;
      }
      [data-order-create] .menu-panel.order-field-invalid .section-head h2::after {
        content: ' *';
        color: #d92d20;
      }
    `;
    document.head.appendChild(style);
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

  function clearInlineErrors(form) {
    if (!form) return;
    $$('.order-inline-error', form).forEach((node) => node.remove());
    $$('.order-field-invalid', form).forEach((node) => node.classList.remove('order-field-invalid'));
    $$('[aria-invalid="true"]', form).forEach((node) => node.removeAttribute('aria-invalid'));
  }

  function fieldWrapperFor(form, name) {
    const input = form.querySelector(`[name="${name}"]`);
    return input?.closest('label') || input;
  }

  function setFieldError(form, name, message) {
    const input = form.querySelector(`[name="${name}"]`);
    const wrapper = fieldWrapperFor(form, name);
    if (!input || !wrapper) return null;

    wrapper.classList.add('order-field-invalid');
    input.setAttribute('aria-invalid', 'true');

    let error = wrapper.querySelector(`.order-inline-error[data-order-error-for="${name}"]`);
    if (!error) {
      error = document.createElement('small');
      error.className = 'order-inline-error';
      error.dataset.orderErrorFor = name;
      wrapper.appendChild(error);
    }
    error.textContent = message;
    return input;
  }

  function setMenuError(form, message) {
    const panel = $('[data-menu-panel]', form);
    const head = panel?.querySelector('.section-head');
    if (!panel || !head) return null;

    panel.classList.add('order-field-invalid');
    let error = panel.querySelector('.order-inline-error[data-order-error-for="items"]');
    if (!error) {
      error = document.createElement('small');
      error.className = 'order-inline-error';
      error.dataset.orderErrorFor = 'items';
      head.insertAdjacentElement('afterend', error);
    }
    error.textContent = message;
    return panel;
  }

  function clearFieldErrorFromTarget(target) {
    const form = target?.closest?.('[data-order-create]');
    if (!form) return;

    const wrapper = target.closest('label.order-field-invalid');
    if (wrapper) {
      wrapper.classList.remove('order-field-invalid');
      wrapper.querySelectorAll('.order-inline-error').forEach((node) => node.remove());
      wrapper.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
    }

    if (String(target.getAttribute?.('name') || '').startsWith('items[') && selectedItems(form) > 0) {
      const panel = $('[data-menu-panel]', form);
      panel?.classList.remove('order-field-invalid');
      panel?.querySelector('.order-inline-error[data-order-error-for="items"]')?.remove();
    }
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

  function patchPreviewValueSetter() {
    if (HTMLTextAreaElement.prototype.__orderPreviewCleanPatched) return;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (!descriptor?.get || !descriptor?.set) return;

    Object.defineProperty(HTMLTextAreaElement.prototype, 'value', {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: function () {
        return descriptor.get.call(this);
      },
      set: function (value) {
        const shouldClean = this?.matches?.('[data-order-preview]');
        descriptor.set.call(this, shouldClean ? cleanBranchCopyText(value) : value);
      }
    });

    Object.defineProperty(HTMLTextAreaElement.prototype, '__orderPreviewCleanPatched', {
      configurable: true,
      value: true
    });
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
    clearInlineErrors(form);

    const type = selectedValue(form, 'order_type') || 'delivery';
    const name = String(form.querySelector('[name="customer_name"]')?.value || '').trim();
    const phone = cleanPhone(form.querySelector('[name="phone"]')?.value || '');
    const address = String(form.querySelector('[name="address"]')?.value || '').trim();
    const branchId = parseInt(form.querySelector('[name="branch_id"]')?.value || '0', 10) || 0;
    const itemCount = selectedItems(form);
    const invalidTargets = [];

    if (type === 'delivery') {
      if (!name) invalidTargets.push(setFieldError(form, 'customer_name', 'Vui lòng nhập tên khách.'));
      if (!/^\d{10}$/.test(phone)) invalidTargets.push(setFieldError(form, 'phone', 'Số điện thoại phải đủ 10 số.'));
      if (!address) invalidTargets.push(setFieldError(form, 'address', 'Vui lòng nhập địa chỉ giao hàng.'));
      if (itemCount <= 0) invalidTargets.push(setMenuError(form, 'Vui lòng chọn ít nhất một món.'));
    } else if (type === 'pickup') {
      if (!name) invalidTargets.push(setFieldError(form, 'customer_name', 'Vui lòng nhập tên khách.'));
      if (branchId <= 0) invalidTargets.push(setFieldError(form, 'branch_id', 'Vui lòng chọn chi nhánh.'));
      if (itemCount <= 0) invalidTargets.push(setMenuError(form, 'Vui lòng chọn ít nhất một món.'));
    } else if (type === 'booking') {
      if (!name) invalidTargets.push(setFieldError(form, 'customer_name', 'Vui lòng nhập tên khách.'));
      if (branchId <= 0) invalidTargets.push(setFieldError(form, 'branch_id', 'Vui lòng chọn chi nhánh.'));
      if ((parseInt(form.querySelector('[name="guest_count"]')?.value || '0', 10) || 0) <= 0) invalidTargets.push(setFieldError(form, 'guest_count', 'Vui lòng nhập số lượng khách.'));
      if (!String(form.querySelector('[name="receive_time"]')?.value || '').trim()) invalidTargets.push(setFieldError(form, 'receive_time', 'Vui lòng nhập thời gian.'));
    }

    const firstTarget = invalidTargets.find(Boolean);
    if (firstTarget) {
      firstTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      window.setTimeout(() => {
        if (firstTarget.matches?.('input, select, textarea')) firstTarget.focus({ preventScroll: true });
      }, 260);
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
    clearFieldErrorFromTarget(event.target);
    if (event.target?.closest?.('[data-order-create]')) {
      window.requestAnimationFrame(cleanPreviewBox);
    }
  }, true);
  document.addEventListener('change', (event) => {
    markDirty(event);
    clearFieldErrorFromTarget(event.target);
    if (event.target?.closest?.('[data-order-create]')) {
      window.requestAnimationFrame(cleanPreviewBox);
    }
  }, true);
  document.addEventListener('click', forceFreshForDirtyCard, true);
  document.addEventListener('click', interceptCopyOrComplete, true);
  document.addEventListener('order-workspace:loaded', (event) => {
    const id = String(event.detail?.order?.id || currentOrderId(event.target));
    if (id) dirtyOrderIds.delete(id);
    clearInlineErrors(event.target?.closest?.('[data-order-create]') || $('[data-order-create]'));
    window.requestAnimationFrame(cleanPreviewBox);
  }, true);

  patchPreviewValueSetter();
  injectOpenPanelWidthFix();
  window.requestAnimationFrame(cleanPreviewBox);
})();
