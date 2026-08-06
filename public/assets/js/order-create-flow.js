(function () {
  const form = document.querySelector('[data-order-create]');
  const newOrderForm = document.querySelector('[data-new-processing-form]');
  if (!form || !newOrderForm) return;

  const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  let busy = false;

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function csrfToken() {
    return $('[name="_csrf"]', form)?.value || document.querySelector('[name="_csrf"]')?.value || '';
  }

  function currentOrderId() {
    return parseInt(form.dataset.currentOrderId || $('[data-edit-order-id]', form)?.value || '0', 10) || 0;
  }

  function setValue(input, value) {
    if (!input) return;
    const next = String(value ?? '');
    if (input.value !== next) input.value = next;
  }

  function setRadio(name, value) {
    const target = form.querySelector(`[name="${name}"][value="${CSS.escape(String(value || ''))}"]`);
    if (target && !target.checked) target.checked = true;
  }

  function setStatus(text, tone) {
    const node = $('[data-draft-sync-status]');
    if (!node) return;
    node.textContent = text;
    node.dataset.autosaveTone = tone || '';
  }

  function setBusy(isBusy) {
    busy = isBusy;
    $$('.cart-panel .primary-actions button', form).forEach((button) => {
      button.disabled = isBusy;
      button.dataset.fastBusy = isBusy ? '1' : '';
    });
    $$('[data-delete-processing-order]').forEach((button) => {
      button.disabled = isBusy;
      button.dataset.fastBusy = isBusy ? '1' : '';
    });
    const add = $('[data-add-processing-order]');
    if (add) add.disabled = isBusy;
  }

  function injectStyles() {
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
      [data-order-create] [data-fast-busy="1"], [data-fast-busy="1"] { opacity: .72; pointer-events: none; }
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
      .open-order-delete-btn {
        width: 32px;
        min-width: 32px;
        height: 32px;
        padding: 0 !important;
        border-radius: 999px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
      }
      .open-order-card.is-sent .open-order-delete-btn { display: none !important; }
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
    injectStyles();
    const node = feedbackNode();
    if (!node) return;
    node.className = `order-copy-feedback is-${tone}`;
    node.textContent = message;
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

  async function postStatus(orderId, status) {
    const data = new FormData();
    data.append('_csrf', csrfToken());
    data.append('workflow_status', status);
    const payload = await fetchJson(`/orders/${orderId}/status`, { method: 'POST', body: data });
    if (!payload.updated) throw new Error('Không chuyển được trạng thái đơn.');
    return payload;
  }

  async function deleteProcessing(orderId) {
    const data = new FormData();
    data.append('_csrf', csrfToken());
    const payload = await fetchJson(`/orders/${orderId}/delete-processing`, { method: 'POST', body: data });
    if (!payload.deleted) throw new Error(payload.message || 'Không xóa được đơn đang xử lý.');
    return payload;
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

  function syncTypeFields(type) {
    const address = $('[data-address-field]', form);
    const paymentField = $('[data-payment-field]', form);
    const paymentSelect = $('[name="payment_method_id"]', form);
    const menuPanel = $('[data-menu-panel]', form);
    const bookingFields = $$('[data-booking-field], [data-booking-note-field]', form);

    if (address) {
      address.hidden = type !== 'delivery';
      $$('input, select, textarea', address).forEach((input) => input.disabled = type !== 'delivery');
    }

    bookingFields.forEach((field) => {
      field.hidden = type !== 'booking';
      $$('input, select, textarea', field).forEach((input) => input.disabled = type !== 'booking');
    });

    if (paymentField && paymentSelect) {
      paymentField.hidden = type === 'booking';
      paymentSelect.disabled = type === 'booking';
      paymentSelect.required = type !== 'booking';
      if (type !== 'booking') {
        let selectedOk = false;
        Array.from(paymentSelect.options).forEach((option) => {
          const allowed = (option.dataset.allowedTypes || '').split(/\s+/).filter(Boolean);
          const visible = allowed.includes(type);
          option.hidden = !visible;
          option.disabled = !visible;
          if (option.selected && visible) selectedOk = true;
        });
        if (!selectedOk) {
          const next = Array.from(paymentSelect.options).find((option) => !option.disabled);
          if (next) next.selected = true;
        }
      }
    }

    if (menuPanel) menuPanel.hidden = type === 'booking';
    $$('[data-menu-card]', form).forEach((card) => {
      const qty = Math.max(0, parseInt($('.qty-input', card)?.value || '0', 10) || 0);
      const noteRow = $('[data-item-note-row]', card);
      const noteInput = noteRow ? $('input', noteRow) : null;
      if (noteRow) noteRow.hidden = qty < 1 || type === 'booking';
      if (noteInput) noteInput.disabled = qty < 1 || type === 'booking';
    });
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

  function selectedItemCount() {
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

  function validateForBranchOrComplete() {
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
      if (selectedItemCount() <= 0) errors.push(setMenuError('Chọn ít nhất 1 món ăn.'));
    } else if (type === 'pickup') {
      if (!name) errors.push(setFieldError('customer_name', 'Nhập tên khách.'));
      if (branchId <= 0) errors.push(setFieldError('branch_id', 'Chọn chi nhánh.'));
      if (selectedItemCount() <= 0) errors.push(setMenuError('Chọn ít nhất 1 món ăn.'));
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
    if (typeof first.focus === 'function') window.setTimeout(() => first.focus({ preventScroll: true }), 180);
    showFeedback('Còn thiếu thông tin. Kiểm tra các ô đang viền đỏ.', 'error');
    return false;
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

  function ensureCardDeleteButton(card) {
    if (!card || card.querySelector('[data-delete-processing-order]')) return;
    const actions = $('.open-order-actions', card);
    if (!actions) return;
    actions.insertAdjacentHTML('beforeend', '<button class="btn ghost open-order-delete-btn" type="button" title="Xóa đơn đang xử lý" data-delete-processing-order>×</button>');
  }

  function decorateProcessingCards() {
    $$('[data-open-order-card].is-processing').forEach(ensureCardDeleteButton);
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
          <div class="open-order-bottom"><b data-open-order-total>${money(order.total)}</b><div class="open-order-actions"><button class="btn ghost open-order-edit-btn is-hidden" type="submit" form="${reopenId}" title="Sửa lại đơn đã gửi CN">✎</button><button class="btn complete" type="submit" form="${completeId}">Hoàn thành</button><button class="btn ghost open-order-delete-btn" type="button" title="Xóa đơn đang xử lý" data-delete-processing-order>×</button></div></div>
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
      const status = $('[data-open-order-status]', card);
      if (status) status.textContent = 'Đang làm';
      const total = $('[data-open-order-total]', card);
      if (total) total.textContent = money(order.total || 0);
      $('.open-order-edit-btn', card)?.classList.add('is-hidden');
      ensureCardDeleteButton(card);
    }
  }

  function updateCardsForActive(orderId) {
    $$('[data-open-order-card]').forEach((card) => {
      const active = String(card.dataset.orderId || '') === String(orderId || '');
      card.classList.toggle('is-editing', active);
      const status = $('[data-open-order-status]', card);
      if (status) status.textContent = active ? 'Đang làm' : (card.classList.contains('is-sent') ? 'Đã gửi CN' : 'Đang xử lý');
    });
  }

  function updatePreviewAndCart(data) {
    const order = data.order || {};
    const payload = data.payload || {};
    const type = payload.order_type || 'delivery';
    const preview = $('[data-order-preview]', form);
    const totalNode = $('[data-order-total]', form);
    const cart = $('[data-cart-lines]', form);
    const total = Number(order.total || 0);

    if (preview) preview.value = cleanBranchCopyText(order.generated_text || '');
    if (totalNode) totalNode.textContent = money(total);

    if (!cart) return;
    if (type === 'booking') {
      cart.innerHTML = `<div class="cart-line"><span>${Number(payload.guest_count || 0)} khách</span><b>Đặt bàn</b></div>`;
      return;
    }

    const rows = Object.entries(payload.items || {})
      .filter(([, qty]) => Number(qty || 0) > 0)
      .map(([id, qty]) => {
        const input = form.querySelector(`[name="items[${CSS.escape(String(id))}]"]`);
        const card = input?.closest('[data-menu-card]');
        const name = card?.dataset.branchName || card?.dataset.customerName || 'Món';
        const price = Number(card?.dataset.price || 0);
        const quantity = Number(qty || 0);
        const note = String((payload.item_notes || {})[String(id)] || '').trim();
        return `<div class="cart-line"><span>${quantity} ${escapeHtml(name)}${note ? ` - ${escapeHtml(note)}` : ''}</span><b>${money(quantity * price)}</b></div>`;
      });
    cart.innerHTML = rows.length ? rows.join('') : '<p class="empty small">Chưa chọn món.</p>';
  }

  function openPayload(data, { focusName = false } = {}) {
    const order = data.order || {};
    const payload = data.payload || {};
    if (!order.id) return;

    const type = payload.order_type || 'delivery';
    form.dataset.workspaceApplying = '1';
    form.dataset.orderEditing = '1';
    form.dataset.currentOrderId = String(order.id);
    form.dataset.editOrderCode = order.order_code || '';
    form.classList.remove('is-workspace-hidden', 'is-workspace-loading');
    $('[data-order-empty-workspace]')?.classList.add('is-hidden');

    setValue($('[data-edit-order-id]', form), order.id);
    const title = $('[data-workspace-title]', form);
    if (title) title.textContent = `Làm tiếp đơn ${order.order_code || '#' + order.id}`;

    setRadio('order_type', type);
    setRadio('source_id', payload.source_id || '');
    ['customer_name', 'phone', 'address', 'receive_time', 'guest_count', 'note'].forEach((name) => setValue(form.querySelector(`[name="${name}"]`), payload[name] || ''));
    setValue(form.querySelector('[name="branch_id"]'), payload.branch_id || '');
    setValue(form.querySelector('[name="payment_method_id"]'), payload.payment_method_id || '');

    const notices = new Set((payload.quick_notices || []).map(String));
    $$('[name="quick_notices[]"]', form).forEach((input) => input.checked = notices.has(input.value));

    $$('[name^="items["]', form).forEach((input) => input.value = '0');
    Object.entries(payload.items || {}).forEach(([id, qty]) => setValue(form.querySelector(`[name="items[${CSS.escape(String(id))}]"]`), qty || 0));
    $$('[name^="item_notes["]', form).forEach((input) => input.value = '');
    Object.entries(payload.item_notes || {}).forEach(([id, note]) => setValue(form.querySelector(`[name="item_notes[${CSS.escape(String(id))}]"]`), note || ''));

    syncTypeFields(type);
    updatePreviewAndCart(data);
    const activeCode = $('[data-active-draft-code]');
    if (activeCode) activeCode.textContent = order.order_code || 'Đang làm';
    const activeInfo = $('[data-active-draft-info]');
    if (activeInfo) activeInfo.textContent = 'Đơn đang xử lý. Thay đổi sẽ tự lưu.';
    updateCardsForActive(order.id);
    setStatus('Đã mở đơn. Nhập thông tin là tự lưu.', 'idle');
    history.replaceState({}, '', `/orders/create?edit_order_id=${order.id}`);

    window.requestAnimationFrame(() => {
      form.dataset.workspaceApplying = '';
      form.dispatchEvent(new CustomEvent('order-workspace:loaded', { bubbles: true, detail: data }));
      if (focusName) form.querySelector('[name="customer_name"]')?.focus({ preventScroll: true });
    });
  }

  async function createProcessingPayload() {
    return fetchJson(newOrderForm.action, { method: 'POST', body: new FormData(newOrderForm) });
  }

  async function openBlankOrder({ focusName = false, message = 'Đang mở đơn trống mới...' } = {}) {
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

  async function openExistingCard(card, { focusName = false } = {}) {
    if (!card?.dataset.editDataUrl) return null;
    setStatus('Đang mở đơn đang xử lý...', 'saving');
    const data = await fetchJson(card.dataset.editDataUrl);
    renderCard(data);
    openPayload(data, { focusName });
    return data;
  }

  function nextProcessingCard(excludeOrderId = 0) {
    return $$('[data-open-order-card].is-processing')
      .find((card) => String(card.dataset.orderId || '') !== String(excludeOrderId || '')) || null;
  }

  async function openNextProcessingOrBlank({ excludeOrderId = 0, focusName = true } = {}) {
    const card = nextProcessingCard(excludeOrderId);
    if (card) {
      return openExistingCard(card, { focusName });
    }
    return openBlankOrder({ focusName, message: 'Không còn đơn đang xử lý, đang mở đơn trống mới...' });
  }

  function customerCopyText() {
    const type = selectedValue('order_type') || 'delivery';
    const customerName = form.querySelector('[name="customer_name"]')?.value.trim() || '...';
    const phone = form.querySelector('[name="phone"]')?.value.trim() || '...';
    const branch = selectedText('branch_id') || 'Chưa chọn';
    const address = form.querySelector('[name="address"]')?.value.trim() || '...';
    const receiveTime = form.querySelector('[name="receive_time"]')?.value.trim() || (type === 'delivery' ? 'Giao ngay' : '...');
    const payment = selectedText('payment_method_id') || '...';
    const items = [];
    let total = 0;

    $$('[data-menu-card]', form).forEach((card) => {
      const quantity = Math.max(0, parseInt($('.qty-input', card)?.value || '0', 10) || 0);
      if (!quantity) return;
      const price = parseInt(card.dataset.price || '0', 10) || 0;
      const name = card.dataset.customerName || card.dataset.branchName || 'Món';
      const note = $('[data-item-note-row] input', card)?.value.trim() || '';
      total += quantity * price;
      items.push(`• ${quantity} ${name}${note ? ` - ${note}` : ''}`);
    });

    const title = type === 'pickup' ? 'ĐƠN GHÉ LẤY' : 'ĐƠN MANG VỀ';
    const lines = [`XÁC NHẬN ${title}`, '', `• Chi nhánh: ${branch}`, `• Tên: ${customerName}`, `• SĐT: ${phone}`];
    if (type === 'delivery') lines.push(`• Địa chỉ: ${address}`);
    lines.push(...(items.length ? items : ['• Món: ...']));
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
    const data = new FormData(form);
    data.set('edit_order_id', String(id));
    data.set('submit_status', 'processing');
    const payload = await fetchJson(`/orders/${id}/autosave`, { method: 'POST', body: data });
    if (!payload.saved) throw new Error(payload.message || 'Không tự lưu được đơn.');
    if (payload.generated_text) $('[data-order-preview]', form).value = cleanBranchCopyText(payload.generated_text);
    if (typeof payload.total !== 'undefined') $('[data-order-total]', form).textContent = money(payload.total);
    return payload;
  }

  function markOrderOut(orderId, status) {
    const card = document.querySelector(`[data-open-order-card][data-order-id="${CSS.escape(String(orderId))}"]`);
    if (!card) return;
    if (status === 'completed') {
      card.remove();
      return;
    }
    card.classList.remove('is-processing', 'is-editing');
    card.classList.add('is-sent');
    const label = $('[data-open-order-status]', card);
    if (label) label.textContent = 'Đã gửi CN';
    $('.open-order-edit-btn', card)?.classList.remove('is-hidden');
    $('[data-delete-processing-order]', card)?.remove();
  }

  async function finishCurrent(status, { copyBranch = false } = {}) {
    if (busy) return;
    if (!validateForBranchOrComplete()) return;
    const orderId = currentOrderId();
    if (!orderId) {
      showFeedback('Đang mở đơn trống, thao tác lại sau 1 giây.', 'info');
      await openNextProcessingOrBlank({ focusName: false });
      return;
    }

    setBusy(true);
    try {
      if (copyBranch) {
        const text = cleanBranchCopyText($('[data-order-preview]', form)?.value || '');
        const copied = await copyText(text);
        if (!copied) throw new Error('Không copy được nội dung gửi CN. Hãy copy thủ công.');
        showFeedback('Đã copy gửi CN. Đang lưu đơn...', 'info');
      } else {
        showFeedback('Đang hoàn thành đơn...', 'info');
      }

      await autosaveCurrent();
      await postStatus(orderId, status);
      markOrderOut(orderId, status);
      await openNextProcessingOrBlank({ excludeOrderId: orderId, focusName: true });
      showFeedback(status === 'sent' ? 'Đã gửi CN. Đã mở đơn đang xử lý kế tiếp.' : 'Đã hoàn thành. Đã mở đơn đang xử lý kế tiếp.', 'success');
    } catch (error) {
      showFeedback(error.message || 'Không xử lý được đơn.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function completeCard(formNode) {
    const match = String(formNode.id || '').match(/active-order-complete-(\d+)/);
    const orderId = match ? parseInt(match[1], 10) : 0;
    if (!orderId || busy) return;

    setBusy(true);
    try {
      await postStatus(orderId, 'completed');
      markOrderOut(orderId, 'completed');
      if (currentOrderId() === orderId || currentOrderId() <= 0) {
        await openNextProcessingOrBlank({ excludeOrderId: orderId, focusName: true });
      }
      showFeedback('Đã hoàn thành đơn. Sẵn sàng nhận đơn tiếp theo.', 'success');
    } catch (error) {
      showFeedback(error.message || 'Không hoàn thành được đơn.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeProcessingCard(button) {
    const card = button.closest('[data-open-order-card].is-processing');
    const orderId = parseInt(card?.dataset.orderId || '0', 10) || 0;
    if (!card || !orderId || busy) return;
    if (!window.confirm('Xóa đơn đang xử lý này?')) return;

    setBusy(true);
    try {
      await deleteProcessing(orderId);
      card.remove();
      if (currentOrderId() === orderId) {
        form.dataset.currentOrderId = '0';
        setValue($('[data-edit-order-id]', form), 0);
        await openNextProcessingOrBlank({ excludeOrderId: orderId, focusName: true });
      }
      showFeedback('Đã xóa đơn đang xử lý.', 'success');
    } catch (error) {
      showFeedback(error.message || 'Không xóa được đơn đang xử lý.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleClick(event) {
    const deleteButton = event.target.closest('[data-delete-processing-order]');
    const branchButton = event.target.closest('[data-copy-preview][data-submit-status-after-copy]');
    const customerButton = event.target.closest('[data-copy-customer]');
    const completeButton = event.target.closest('[data-order-create] .primary-actions button[type="submit"]');
    if (!deleteButton && !branchButton && !customerButton && !completeButton) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (deleteButton) {
      await removeProcessingCard(deleteButton);
      return;
    }

    if (!event.target.closest('[data-order-create]')) return;

    if (customerButton) {
      const copied = await copyText(customerCopyText());
      showFeedback(copied ? 'Đã copy nội dung gửi khách hàng.' : 'Không copy được nội dung gửi khách. Hãy copy thủ công.', copied ? 'success' : 'error');
      return;
    }

    if (branchButton) {
      await finishCurrent(branchButton.dataset.submitStatusAfterCopy || 'sent', { copyBranch: true });
      return;
    }

    await finishCurrent('completed', { copyBranch: false });
  }

  async function handleSubmit(event) {
    const addForm = event.target.closest('[data-new-processing-form]');
    const completeForm = event.target.closest('.active-order-complete-form');
    const workspaceSubmit = event.target.closest('[data-order-create]');

    if (addForm) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (busy) return;
      setBusy(true);
      try {
        await openBlankOrder({ focusName: true, message: 'Đang tạo đơn mới...' });
        showFeedback('Đã tạo đơn mới. Nhập thông tin là tự lưu.', 'success');
      } catch (error) {
        showFeedback(error.message || 'Không tạo được đơn mới.', 'error');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (completeForm) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      await completeCard(completeForm);
      return;
    }

    if (workspaceSubmit && event.submitter?.closest?.('.primary-actions')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }

  function clearInlineErrorFromTarget(target) {
    const wrapper = target?.closest?.('label.order-field-invalid');
    if (wrapper) {
      wrapper.classList.remove('order-field-invalid');
      wrapper.querySelectorAll('.order-inline-error').forEach((node) => node.remove());
      wrapper.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
    }
    if (String(target?.name || '').startsWith('items[') && selectedItemCount() > 0) {
      const panel = $('[data-menu-panel]', form);
      panel?.classList.remove('order-field-invalid');
      panel?.querySelector('.order-inline-error[data-order-error-for="items"]')?.remove();
    }
  }

  async function ensureWorkingOrder() {
    if (currentOrderId() > 0) {
      decorateProcessingCards();
      return;
    }
    const firstProcessing = nextProcessingCard();
    try {
      if (firstProcessing) {
        await openExistingCard(firstProcessing, { focusName: true });
        decorateProcessingCards();
        return;
      }
      await openBlankOrder({ focusName: true, message: 'Đang mở sẵn đơn trống để nhập thông tin...' });
      decorateProcessingCards();
    } catch (error) {
      showFeedback(error.message || 'Không mở được đơn trống.', 'error');
    }
  }

  document.addEventListener('click', handleClick, true);
  document.addEventListener('submit', handleSubmit, true);
  form.addEventListener('input', (event) => clearInlineErrorFromTarget(event.target), true);
  form.addEventListener('change', (event) => clearInlineErrorFromTarget(event.target), true);

  injectStyles();
  decorateProcessingCards();
  window.setTimeout(ensureWorkingOrder, 120);
})();
