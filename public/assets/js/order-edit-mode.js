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

  function injectCopyFeedbackStyles() {
    if (document.querySelector('[data-copy-feedback-style]')) return;
    const style = document.createElement('style');
    style.dataset.copyFeedbackStyle = '1';
    style.textContent = `
      .order-copy-feedback {
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 800;
        line-height: 1.35;
        border: 1px solid transparent;
      }
      .order-copy-feedback.is-success { background: #ecfdf3; border-color: #abefc6; color: #067647; }
      .order-copy-feedback.is-info { background: #eff8ff; border-color: #b2ddff; color: #175cd3; }
      .order-copy-feedback.is-error { background: #fef3f2; border-color: #fecdca; color: #b42318; }
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
    `;
    document.head.appendChild(style);
  }

  function feedbackNode() {
    const actions = form.querySelector('.cart-panel .primary-actions');
    if (!actions) return null;
    let node = form.querySelector('[data-order-copy-feedback]');
    if (!node) {
      node = document.createElement('div');
      node.dataset.orderCopyFeedback = '1';
      node.className = 'order-copy-feedback is-info';
      actions.insertAdjacentElement('afterend', node);
    }
    return node;
  }

  function showCopyFeedback(message, tone = 'info') {
    injectCopyFeedbackStyles();
    const node = feedbackNode();
    if (!node) return;
    node.className = `order-copy-feedback is-${tone}`;
    node.textContent = message;
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

  async function copyWithFallback(text) {
    const value = String(text || '').trim();
    if (!value) return false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (error) {}

    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch (error) {
      return false;
    }
  }

  function selectedValue(name) {
    return form.querySelector(`[name="${name}"]:checked`)?.value || form.querySelector(`[name="${name}"]`)?.value || '';
  }

  function selectedText(name) {
    const select = form.querySelector(`[name="${name}"]`);
    if (!select || select.selectedIndex < 0) return '';
    return select.options[select.selectedIndex]?.textContent.trim() || '';
  }

  function cleanPhone(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function selectedItems() {
    return Array.from(form.querySelectorAll('[name^="items["]'))
      .map((input) => Math.max(0, parseInt(input.value || '0', 10) || 0))
      .reduce((sum, qty) => sum + qty, 0);
  }

  function clearInlineErrors() {
    form.querySelectorAll('.order-inline-error').forEach((node) => node.remove());
    form.querySelectorAll('.order-field-invalid').forEach((node) => node.classList.remove('order-field-invalid'));
    form.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
  }

  function setFieldError(name, message) {
    const input = form.querySelector(`[name="${name}"]`);
    const wrapper = input?.closest('label') || input;
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

  function setMenuError(message) {
    const panel = form.querySelector('[data-menu-panel]');
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

  function validateBeforeBranchCopy() {
    clearInlineErrors();
    const type = selectedValue('order_type') || 'delivery';
    const name = form.querySelector('[name="customer_name"]')?.value.trim() || '';
    const phone = cleanPhone(form.querySelector('[name="phone"]')?.value || '');
    const address = form.querySelector('[name="address"]')?.value.trim() || '';
    const branchId = parseInt(form.querySelector('[name="branch_id"]')?.value || '0', 10) || 0;
    const errors = [];

    if (type === 'delivery') {
      if (!name) errors.push(setFieldError('customer_name', 'Nhập tên khách.'));
      if (!/^\d{10}$/.test(phone)) errors.push(setFieldError('phone', 'Nhập SĐT đúng 10 số.'));
      if (!address) errors.push(setFieldError('address', 'Nhập địa chỉ giao hàng.'));
      if (selectedItems() <= 0) errors.push(setMenuError('Chọn ít nhất 1 món ăn.'));
    } else if (type === 'pickup') {
      if (!name) errors.push(setFieldError('customer_name', 'Nhập tên khách.'));
      if (branchId <= 0) errors.push(setFieldError('branch_id', 'Chọn chi nhánh.'));
      if (selectedItems() <= 0) errors.push(setMenuError('Chọn ít nhất 1 món ăn.'));
    }

    const first = errors.find(Boolean);
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof first.focus === 'function') window.setTimeout(() => first.focus({ preventScroll: true }), 280);
      showCopyFeedback('Còn thiếu thông tin. Kiểm tra các ô đang viền đỏ.', 'error');
      return false;
    }
    return true;
  }

  function orderTitle(type) {
    return type === 'pickup' ? 'ĐƠN GHÉ LẤY' : 'ĐƠN MANG VỀ';
  }

  function timeLabel(type) {
    if (type === 'pickup') return 'Thời gian ghé lấy';
    return 'Thời gian nhận';
  }

  function customerCopyText() {
    const type = selectedValue('order_type') || 'delivery';
    const customerName = form.querySelector('[name="customer_name"]')?.value.trim() || '...';
    const phone = form.querySelector('[name="phone"]')?.value.trim() || '...';
    const branch = selectedText('branch_id') || 'Chưa chọn';
    const address = form.querySelector('[name="address"]')?.value.trim() || '...';
    const receiveTime = form.querySelector('[name="receive_time"]')?.value.trim() || (type === 'delivery' ? 'Giao ngay' : '...');
    const payment = selectedText('payment_method_id') || '...';
    let total = 0;
    const itemLines = [];

    form.querySelectorAll('[data-menu-card]').forEach((card) => {
      const quantity = Math.max(0, parseInt(card.querySelector('.qty-input')?.value || '0', 10) || 0);
      if (!quantity) return;
      const price = parseInt(card.dataset.price || '0', 10) || 0;
      const name = card.dataset.customerName || card.dataset.branchName || 'Món';
      const note = card.querySelector('[data-item-note-row] input')?.value.trim() || '';
      total += quantity * price;
      itemLines.push(`• ${quantity} ${name}${note ? ` - ${note}` : ''}`);
    });

    const lines = [
      `XÁC NHẬN ${orderTitle(type)}`,
      '',
      `• Chi nhánh: ${branch}`,
      `• Tên: ${customerName}`,
      `• SĐT: ${phone}`
    ];
    if (type === 'delivery') lines.push(`• Địa chỉ: ${address}`);
    lines.push(...(itemLines.length ? itemLines : ['• Món: ...']));
    lines.push(`=> Tổng: ${money(total)}`);
    lines.push(`• ${timeLabel(type)}: ${receiveTime}`);
    lines.push(`• Hình thức thanh toán: ${payment}`);
    return lines.join('\n');
  }

  function csrfToken() {
    return form.querySelector('[name="_csrf"]')?.value || document.querySelector('[name="_csrf"]')?.value || '';
  }

  async function postStatus(status) {
    const id = orderId();
    if (!id) throw new Error('Chưa chọn đơn để xử lý.');
    const formData = new FormData();
    formData.append('_csrf', csrfToken());
    formData.append('workflow_status', status);

    const response = await fetch(`/orders/${id}/status`, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!response.ok) throw new Error('Đã copy nhưng chưa chuyển được trạng thái đơn.');
  }

  async function handleCopyButtons(event) {
    const branchButton = event.target.closest('[data-copy-preview][data-submit-status-after-copy]');
    const customerButton = event.target.closest('[data-copy-customer]');
    if (!branchButton && !customerButton) return;
    if (!event.target.closest('[data-order-create]')) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (customerButton) {
      const copied = await copyWithFallback(customerCopyText());
      showCopyFeedback(copied ? 'Đã copy nội dung gửi khách hàng.' : 'Không copy được nội dung gửi khách. Hãy copy thủ công.', copied ? 'success' : 'error');
      return;
    }

    if (!validateBeforeBranchCopy()) return;

    const preview = form.querySelector('[data-order-preview]');
    const text = cleanBranchCopyText(preview?.value || '');
    const copied = await copyWithFallback(text);
    if (!copied) {
      showCopyFeedback('Không copy được nội dung gửi CN. Hãy copy thủ công.', 'error');
      return;
    }

    showCopyFeedback('Đã copy nội dung gửi CN. Đang lưu đơn và chuyển sang Đã gửi CN...', 'info');
    const previousSubmitting = isSubmitting;
    try {
      isSubmitting = false;
      if (autosaveTimer) clearTimeout(autosaveTimer);
      const saved = await autosaveNow({ quiet: true });
      if (!saved) throw new Error('Đã copy nhưng chưa tự lưu được đơn. Kiểm tra lại mạng trước khi gửi tiếp.');
      await postStatus(branchButton.dataset.submitStatusAfterCopy || 'sent');
      showCopyFeedback('Đã copy gửi CN và chuyển trạng thái Đã gửi CN.', 'success');
      window.setTimeout(() => {
        window.location.href = `/orders/create?edit_order_id=${orderId()}`;
      }, 700);
    } catch (error) {
      showCopyFeedback(error.message || 'Đã copy nhưng chưa xử lý xong trạng thái đơn.', 'error');
    } finally {
      isSubmitting = previousSubmitting;
    }
  }

  function clearInlineErrorFromTarget(target) {
    const wrapper = target?.closest?.('label.order-field-invalid');
    if (wrapper) {
      wrapper.classList.remove('order-field-invalid');
      wrapper.querySelectorAll('.order-inline-error').forEach((node) => node.remove());
      wrapper.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
    }
    if (String(target?.name || '').startsWith('items[') && selectedItems() > 0) {
      const panel = form.querySelector('[data-menu-panel]');
      panel?.classList.remove('order-field-invalid');
      panel?.querySelector('.order-inline-error[data-order-error-for="items"]')?.remove();
    }
  }

  form.addEventListener('input', (event) => {
    if (isApplying()) return;
    clearInlineErrorFromTarget(event.target);
    if (shouldAutosaveEventTarget(event.target)) queueAutosave();
  }, true);

  form.addEventListener('change', (event) => {
    if (isApplying()) return;
    clearInlineErrorFromTarget(event.target);
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

  document.addEventListener('click', handleCopyButtons, true);
  document.addEventListener('click', saveBeforeNavigation, true);
  window.addEventListener('beforeunload', sendBeaconAutosave);

  injectCopyFeedbackStyles();
  lastSavedSignature = formSignature();
  refreshHeader();
  if (orderId() > 0) setStatus('Đã mở đơn. Sửa gì hệ thống sẽ tự lưu.', 'idle');
})();
