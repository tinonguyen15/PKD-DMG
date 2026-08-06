(function () {
  const form = document.querySelector('[data-order-create]');
  const newOrderForm = document.querySelector('[data-new-processing-form]');
  if (!form || !newOrderForm) return;

  const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const busyButtons = new Set();

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function currentOrderId() {
    return parseInt(form.dataset.currentOrderId || $('[data-edit-order-id]', form)?.value || '0', 10) || 0;
  }

  function csrfToken() {
    return $('[name="_csrf"]', form)?.value || document.querySelector('[name="_csrf"]')?.value || '';
  }

  function setStatus(text, tone) {
    const node = $('[data-draft-sync-status]');
    if (!node) return;
    node.textContent = text;
    node.dataset.autosaveTone = tone || '';
  }

  function injectFastUiStyles() {
    if (document.querySelector('[data-fast-order-style]')) return;
    const style = document.createElement('style');
    style.dataset.fastOrderStyle = '1';
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
      [data-order-create] [data-fast-busy="1"] {
        opacity: .72;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  function feedbackNode() {
    const actions = $('.cart-panel .primary-actions', form);
    if (!actions) return null;
    let node = $('[data-order-copy-feedback]', form);
    if (!node) {
      node = document.createElement('div');
      node.dataset.orderCopyFeedback = '1';
      node.className = 'order-copy-feedback is-info';
      actions.insertAdjacentElement('afterend', node);
    }
    return node;
  }

  function showFeedback(message, tone = 'info') {
    injectFastUiStyles();
    const node = feedbackNode();
    if (!node) return;
    node.className = `order-copy-feedback is-${tone}`;
    node.textContent = message;
  }

  function setButtonsBusy(isBusy) {
    $$('.cart-panel .primary-actions button', form).forEach((button) => {
      if (isBusy) {
        busyButtons.add(button);
        button.dataset.fastBusy = '1';
        button.disabled = true;
      } else if (busyButtons.has(button)) {
        busyButtons.delete(button);
        button.dataset.fastBusy = '';
        button.disabled = false;
      }
    });
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Không xử lý được yêu cầu.');
    return payload;
  }

  async function createProcessingPayload() {
    return fetchJson(newOrderForm.action, {
      method: 'POST',
      body: new FormData(newOrderForm)
    });
  }

  function setValue(input, value) {
    if (!input) return;
    const next = String(value ?? '');
    if (input.value !== next) input.value = next;
  }

  function setRadio(name, value) {
    const target = form.querySelector(`[name="${name}"][value="${CSS.escape(String(value || ''))}"]`);
    if (target) target.checked = true;
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

  function renderCard(data) {
    const order = data.order || {};
    if (!order.id) return;

    let card = document.querySelector(`[data-open-order-card][data-order-id="${CSS.escape(String(order.id))}"]`);
    if (!card) {
      $('[data-open-order-empty]')?.remove();
      const completeId = `active-order-complete-${order.id}`;
      const reopenId = `active-order-reopen-${order.id}`;
      $('[data-open-order-list]')?.insertAdjacentHTML('afterbegin', `
        <article class="open-order-card is-processing" data-open-order-card data-order-id="${order.id}" data-edit-data-url="/orders/${order.id}/edit-data" data-open-order-url="/orders/create?edit_order_id=${order.id}">
          <div class="open-order-main"><a href="/orders/${order.id}">${escapeHtml(order.order_code || ('#' + order.id))}</a><span data-open-order-status>Đang xử lý</span></div>
          <div class="open-order-meta" data-open-order-meta>Chưa nhập tên<br>${escapeHtml(order.branch_name || 'Chưa CN')} | ${escapeHtml(order.source_name || 'Chưa nguồn')}</div>
          <div class="open-order-bottom"><b data-open-order-total>${money(order.total)}</b><div class="open-order-actions"><button class="btn ghost open-order-edit-btn is-hidden" type="submit" form="${reopenId}" title="Sửa lại đơn đã gửi CN">✎</button><button class="btn complete" type="submit" form="${completeId}">Hoàn thành</button></div></div>
        </article>
      `);
      $('[data-open-order-forms]')?.insertAdjacentHTML('beforeend', `
        <form id="${completeId}" class="active-order-complete-form" method="post" action="/orders/${order.id}/status"><input type="hidden" name="_csrf" value="${escapeHtml(csrfToken())}"><input type="hidden" name="workflow_status" value="completed"></form>
        <form id="${reopenId}" class="active-order-reopen-form" method="post" action="/orders/${order.id}/reopen-edit-json"><input type="hidden" name="_csrf" value="${escapeHtml(csrfToken())}"></form>
      `);
      card = document.querySelector(`[data-open-order-card][data-order-id="${CSS.escape(String(order.id))}"]`);
    }

    if (card) {
      card.classList.remove('is-sent');
      card.classList.add('is-processing', 'is-editing');
      $('[data-open-order-status]', card) && ($('[data-open-order-status]', card).textContent = 'Đang làm');
      $('[data-open-order-total]', card) && ($('[data-open-order-total]', card).textContent = money(order.total));
      $('.open-order-edit-btn', card)?.classList.add('is-hidden');
    }
  }

  function openPayload(data, { focusName = false } = {}) {
    const order = data.order || {};
    const payload = data.payload || {};
    if (!order.id) return;

    form.dataset.workspaceApplying = '1';
    form.dataset.orderEditing = '1';
    form.dataset.currentOrderId = String(order.id);
    form.dataset.editOrderCode = order.order_code || '';
    form.classList.remove('is-workspace-hidden', 'is-workspace-loading');
    $('[data-order-empty-workspace]')?.classList.add('is-hidden');

    setValue($('[data-edit-order-id]', form), order.id);
    const title = $('[data-workspace-title]', form);
    if (title) title.textContent = `Làm tiếp đơn ${order.order_code || '#' + order.id}`;

    setRadio('order_type', payload.order_type || 'delivery');
    setRadio('source_id', payload.source_id || '');
    ['customer_name', 'phone', 'address', 'receive_time', 'guest_count', 'note'].forEach((name) => {
      setValue(form.querySelector(`[name="${name}"]`), payload[name] || '');
    });
    setValue(form.querySelector('[name="branch_id"]'), payload.branch_id || '');
    setValue(form.querySelector('[name="payment_method_id"]'), payload.payment_method_id || '');
    $$('[name="quick_notices[]"]', form).forEach((input) => input.checked = false);
    $$('[name^="items["]', form).forEach((input) => input.value = '0');
    $$('[name^="item_notes["]', form).forEach((input) => input.value = '');
    $$('[data-item-note-row]', form).forEach((row) => row.hidden = true);

    const preview = $('[data-order-preview]', form);
    if (preview) preview.value = cleanBranchCopyText(order.generated_text || '');
    $('[data-order-total]', form) && ($('[data-order-total]', form).textContent = money(order.total));
    $('[data-cart-lines]', form) && ($('[data-cart-lines]', form).innerHTML = '<p class="empty small">Chưa chọn món.</p>');
    $('[data-active-draft-code]') && ($('[data-active-draft-code]').textContent = order.order_code || 'Đang làm');
    $('[data-active-draft-info]') && ($('[data-active-draft-info]').textContent = 'Đơn đang xử lý. Thay đổi sẽ tự lưu.');

    $$('.open-order-card').forEach((card) => {
      const active = String(card.dataset.orderId || '') === String(order.id);
      card.classList.toggle('is-editing', active);
      const label = $('[data-open-order-status]', card);
      if (label) label.textContent = active ? 'Đang làm' : (card.classList.contains('is-sent') ? 'Đã gửi CN' : 'Đang xử lý');
    });

    setStatus('Đã mở đơn trống. Nhập thông tin là tự lưu.', 'idle');
    history.replaceState({}, '', `/orders/create?edit_order_id=${order.id}`);
    window.requestAnimationFrame(() => {
      form.dataset.workspaceApplying = '';
      form.dispatchEvent(new CustomEvent('order-workspace:loaded', { bubbles: true, detail: data }));
      if (focusName) form.querySelector('[name="customer_name"]')?.focus({ preventScroll: true });
    });
  }

  async function openBlankOrder({ focusName = false, message = 'Đang tạo đơn trống mới...' } = {}) {
    if (newOrderForm.dataset.autoCreating === '1') return null;
    newOrderForm.dataset.autoCreating = '1';
    setStatus(message, 'saving');
    try {
      const data = await createProcessingPayload();
      renderCard(data);
      openPayload(data, { focusName });
      return data;
    } finally {
      newOrderForm.dataset.autoCreating = '';
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
    return $$('[name^="items["]', form)
      .map((input) => Math.max(0, parseInt(input.value || '0', 10) || 0))
      .reduce((sum, qty) => sum + qty, 0);
  }

  function clearInlineErrors() {
    $$('.order-inline-error', form).forEach((node) => node.remove());
    $$('.order-field-invalid', form).forEach((node) => node.classList.remove('order-field-invalid'));
    $$('[aria-invalid="true"]', form).forEach((node) => node.removeAttribute('aria-invalid'));
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

  function validateForClose() {
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
    } else if (type === 'booking') {
      if (!name) errors.push(setFieldError('customer_name', 'Nhập tên khách.'));
      if (branchId <= 0) errors.push(setFieldError('branch_id', 'Chọn chi nhánh.'));
      const guests = parseInt(form.querySelector('[name="guest_count"]')?.value || '0', 10) || 0;
      if (guests <= 0) errors.push(setFieldError('guest_count', 'Nhập số lượng khách.'));
      if (!String(form.querySelector('[name="receive_time"]')?.value || '').trim()) errors.push(setFieldError('receive_time', 'Nhập thời gian.'));
    }

    const first = errors.find(Boolean);
    if (!first) return true;
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof first.focus === 'function') window.setTimeout(() => first.focus({ preventScroll: true }), 240);
    showFeedback('Còn thiếu thông tin. Kiểm tra các ô đang viền đỏ.', 'error');
    return false;
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

    $$('[data-menu-card]', form).forEach((card) => {
      const quantity = Math.max(0, parseInt($('.qty-input', card)?.value || '0', 10) || 0);
      if (!quantity) return;
      const price = parseInt(card.dataset.price || '0', 10) || 0;
      const name = card.dataset.customerName || card.dataset.branchName || 'Món';
      const note = $('[data-item-note-row] input', card)?.value.trim() || '';
      total += quantity * price;
      itemLines.push(`• ${quantity} ${name}${note ? ` - ${note}` : ''}`);
    });

    const title = type === 'pickup' ? 'ĐƠN GHÉ LẤY' : 'ĐƠN MANG VỀ';
    const lines = [`XÁC NHẬN ${title}`, '', `• Chi nhánh: ${branch}`, `• Tên: ${customerName}`, `• SĐT: ${phone}`];
    if (type === 'delivery') lines.push(`• Địa chỉ: ${address}`);
    lines.push(...(itemLines.length ? itemLines : ['• Món: ...']));
    lines.push(`=> Tổng: ${money(total)}`);
    lines.push(`• ${type === 'pickup' ? 'Thời gian ghé lấy' : 'Thời gian nhận'}: ${receiveTime}`);
    lines.push(`• Hình thức thanh toán: ${payment}`);
    return lines.join('\n');
  }

  async function copyText(text) {
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

  async function autosaveCurrent() {
    const id = currentOrderId();
    if (!id) throw new Error('Chưa có đơn đang làm.');
    const formData = new FormData(form);
    formData.set('edit_order_id', String(id));
    formData.set('submit_status', 'processing');

    const payload = await fetchJson(`/orders/${id}/autosave`, {
      method: 'POST',
      body: formData
    });
    if (!payload.saved) throw new Error(payload.message || 'Không tự lưu được đơn.');
    if (typeof payload.total !== 'undefined') $('[data-order-total]', form) && ($('[data-order-total]', form).textContent = money(payload.total));
    if (payload.generated_text) $('[data-order-preview]', form).value = cleanBranchCopyText(payload.generated_text);
    return payload;
  }

  async function postStatus(orderId, status) {
    const formData = new FormData();
    formData.append('_csrf', csrfToken());
    formData.append('workflow_status', status);
    const response = await fetch(`/orders/${orderId}/status`, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!response.ok) throw new Error('Không chuyển được trạng thái đơn.');
  }

  function markCurrentCardDone(orderId, status) {
    const card = document.querySelector(`[data-open-order-card][data-order-id="${CSS.escape(String(orderId))}"]`);
    if (!card) return;

    if (status === 'completed') {
      card.remove();
      return;
    }

    card.classList.remove('is-processing', 'is-editing');
    card.classList.add('is-sent');
    $('[data-open-order-status]', card) && ($('[data-open-order-status]', card).textContent = 'Đã gửi CN');
    $('.open-order-edit-btn', card)?.classList.remove('is-hidden');
  }

  async function finishCurrentTo(status, { copyBranch = false } = {}) {
    if (!validateForClose()) return;
    const orderId = currentOrderId();
    if (!orderId) {
      showFeedback('Đang tạo đơn trống, thao tác lại sau 1 giây.', 'info');
      await openBlankOrder({ focusName: false });
      return;
    }

    setButtonsBusy(true);
    try {
      if (copyBranch) {
        const text = cleanBranchCopyText($('[data-order-preview]', form)?.value || '');
        const copied = await copyText(text);
        if (!copied) throw new Error('Không copy được nội dung gửi CN. Hãy copy thủ công.');
        showFeedback('Đã copy gửi CN. Đang lưu và mở đơn mới...', 'info');
      } else {
        showFeedback('Đang lưu và hoàn thành đơn...', 'info');
      }

      await autosaveCurrent();
      await postStatus(orderId, status);
      markCurrentCardDone(orderId, status);
      showFeedback(status === 'sent' ? 'Đã gửi CN. Đã mở sẵn đơn mới.' : 'Đã hoàn thành đơn. Đã mở sẵn đơn mới.', 'success');
      await openBlankOrder({ focusName: true, message: 'Đang mở đơn trống tiếp theo...' });
    } catch (error) {
      showFeedback(error.message || 'Không xử lý được đơn.', 'error');
    } finally {
      setButtonsBusy(false);
    }
  }

  async function handleFastClick(event) {
    const branchButton = event.target.closest('[data-copy-preview][data-submit-status-after-copy]');
    const customerButton = event.target.closest('[data-copy-customer]');
    const completeButton = event.target.closest('[data-order-create] .primary-actions button[type="submit"]');
    if (!branchButton && !customerButton && !completeButton) return;
    if (!event.target.closest('[data-order-create]')) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (customerButton) {
      const copied = await copyText(customerCopyText());
      showFeedback(copied ? 'Đã copy nội dung gửi khách hàng.' : 'Không copy được nội dung gửi khách. Hãy copy thủ công.', copied ? 'success' : 'error');
      return;
    }

    if (branchButton) {
      await finishCurrentTo(branchButton.dataset.submitStatusAfterCopy || 'sent', { copyBranch: true });
      return;
    }

    await finishCurrentTo('completed', { copyBranch: false });
  }

  async function handleNewOrderSubmit(event) {
    if (!event.target.closest('[data-new-processing-form]')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    setButtonsBusy(true);
    try {
      await openBlankOrder({ focusName: true, message: 'Đang tạo đơn mới...' });
      showFeedback('Đã tạo đơn mới, nhập thông tin là tự lưu.', 'success');
    } catch (error) {
      showFeedback(error.message || 'Không tạo được đơn mới.', 'error');
    } finally {
      setButtonsBusy(false);
    }
  }

  function ensureAlwaysHasWorkingOrder() {
    if (currentOrderId() > 0) return;
    if (document.querySelector('[data-open-order-card].is-processing')) return;
    openBlankOrder({ focusName: true, message: 'Đang mở sẵn đơn trống để nhập thông tin...' }).catch((error) => {
      showFeedback(error.message || 'Không tạo được đơn trống.', 'error');
    });
  }

  function clearInlineErrorFromTarget(target) {
    const wrapper = target?.closest?.('label.order-field-invalid');
    if (wrapper) {
      wrapper.classList.remove('order-field-invalid');
      wrapper.querySelectorAll('.order-inline-error').forEach((node) => node.remove());
      wrapper.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
    }
    if (String(target?.name || '').startsWith('items[') && selectedItems() > 0) {
      const panel = $('[data-menu-panel]', form);
      panel?.classList.remove('order-field-invalid');
      panel?.querySelector('.order-inline-error[data-order-error-for="items"]')?.remove();
    }
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  document.addEventListener('click', handleFastClick, true);
  document.addEventListener('submit', handleNewOrderSubmit, true);
  form.addEventListener('submit', (event) => {
    const submitter = event.submitter;
    if (submitter?.closest?.('.primary-actions')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);
  form.addEventListener('input', (event) => clearInlineErrorFromTarget(event.target), true);
  form.addEventListener('change', (event) => clearInlineErrorFromTarget(event.target), true);

  injectFastUiStyles();
  window.setTimeout(ensureAlwaysHasWorkingOrder, 180);
})();
