(function () {
  const form = document.querySelector('[data-order-create]');
  if (!form) return;

  function isInteractiveTarget(target) {
    return Boolean(target.closest('button, input, select, textarea, label, a, [data-qty-step], [data-item-note-row], .qty-control'));
  }

  function syncNoteState(card) {
    const noteInput = card.querySelector('[data-item-note-row] input');
    if (!noteInput) return;
    card.classList.toggle('has-note', noteInput.value.trim() !== '');
  }

  form.querySelectorAll('[data-menu-card]').forEach(syncNoteState);

  form.addEventListener('input', (event) => {
    const noteInput = event.target.closest('[data-item-note-row] input');
    if (!noteInput) return;
    const card = noteInput.closest('[data-menu-card]');
    if (card) syncNoteState(card);
  });

  form.addEventListener('click', (event) => {
    const card = event.target.closest('[data-menu-card]');
    if (!card || !form.contains(card)) return;
    if (isInteractiveTarget(event.target)) return;

    const input = card.querySelector('.qty-input');
    if (!input || input.disabled) return;

    const next = Math.max(0, (parseInt(input.value || '0', 10) || 0) + 1);
    input.value = String(next);
    card.classList.add('is-card-picked', 'is-note-open');
    syncNoteState(card);
    window.setTimeout(() => card.classList.remove('is-card-picked'), 180);

    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
})();

(function () {
  const form = document.querySelector('[data-order-create]');
  if (!form) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let previewQueued = false;

  function money(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  }

  function preferences() {
    try {
      return JSON.parse(document.querySelector('[data-order-preferences]')?.textContent || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  const prefs = preferences();

  function boolPref(key, fallback = false) {
    if (!Object.prototype.hasOwnProperty.call(prefs, key)) return fallback;
    const value = prefs[key];
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function textPref(key, fallback = '') {
    return String(Object.prototype.hasOwnProperty.call(prefs, key) ? prefs[key] : fallback || '').trim();
  }

  function selectedValue(name) {
    return form.querySelector(`[name="${name}"]:checked`)?.value || form.querySelector(`[name="${name}"]`)?.value || '';
  }

  function selectedText(name, fallback = '') {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) return fallback;
    if (input.tagName === 'SELECT') {
      if (!input.value) return fallback;
      return input.options[input.selectedIndex]?.textContent.trim() || fallback;
    }
    const radio = form.querySelector(`[name="${name}"]:checked`);
    if (radio) return radio.closest('label')?.textContent.trim() || radio.value || fallback;
    return input.value || fallback;
  }

  function field(name) {
    return String(form.querySelector(`[name="${name}"]`)?.value || '').trim();
  }

  function selectedQuickNoticeMessages() {
    const map = {
      paid_ck: 'copy_branch_quick_notice_paid_ck',
      call_before_delivery: 'copy_branch_quick_notice_call_before_delivery',
      urgent: 'copy_branch_quick_notice_urgent',
      invoice: 'copy_branch_quick_notice_invoice'
    };

    return $$('[name="quick_notices[]"]:checked', form)
      .map((input) => textPref(map[input.value] || ''))
      .filter(Boolean);
  }

  function paymentName() {
    return selectedText('payment_method_id', '');
  }

  function branchTag() {
    if (!boolPref('copy_branch_include_tag', false)) return '';
    const branchId = String(form.querySelector('[name="branch_id"]')?.value || '0');
    const byBranch = prefs.copy_branch_tag_by_branch && typeof prefs.copy_branch_tag_by_branch === 'object'
      ? prefs.copy_branch_tag_by_branch
      : {};
    const branchSpecific = String(byBranch[branchId] || '').trim();
    if (branchSpecific) return branchSpecific;
    if (boolPref('copy_branch_tag_require_branch_match', false) && branchId === '0') return '';
    return textPref('copy_branch_tag_text');
  }

  function branchNoticeLines() {
    const lines = [];
    selectedQuickNoticeMessages().forEach((message) => lines.push(message));

    const payment = paymentName();
    const type = selectedValue('order_type') || 'delivery';
    const receiveTime = field('receive_time');
    let message = '';

    if (boolPref('copy_branch_notice_default_enabled', false) || boolPref('copy_branch_include_notice', false)) {
      message = textPref('copy_branch_notice_default');
    }
    if (payment === 'Chuyển khoản' && boolPref('copy_branch_notice_bank_transfer_enabled', false)) {
      message = textPref('copy_branch_notice_bank_transfer', message);
    } else if (payment === 'COD' && boolPref('copy_branch_notice_cod_enabled', false)) {
      message = textPref('copy_branch_notice_cod', message);
    } else if ((type === 'pickup' || receiveTime !== '') && boolPref('copy_branch_notice_scheduled_enabled', false)) {
      message = textPref('copy_branch_notice_scheduled', message);
    }

    if (message) lines.push(message);
    const tag = branchTag();
    if (tag) lines.push(tag);
    return lines;
  }

  function selectedItems(target = 'branch') {
    return $$('[data-menu-card]', form).map((card) => {
      const quantity = Math.max(0, parseInt($('.qty-input', card)?.value || '0', 10) || 0);
      if (!quantity) return null;
      const note = String($('[data-item-note-row] input', card)?.value || '').trim();
      const unitPrice = Number(card.dataset.price || 0);
      const isCustomer = target === 'customer';
      const name = isCustomer
        ? (card.dataset.customerName || card.dataset.branchName || 'Món')
        : (card.dataset.branchName || card.dataset.customerName || 'Món');
      const includePrice = isCustomer
        ? boolPref('copy_customer_show_item_price', true)
        : boolPref('copy_branch_show_item_price', false);
      return {
        quantity,
        name,
        note,
        unitPrice,
        lineTotal: quantity * unitPrice,
        text: `${quantity} ${name}${includePrice ? ` - ${money(unitPrice)}` : ''}${note ? ` - ${note}` : ''}`
      };
    }).filter(Boolean);
  }

  function total(items) {
    return items.reduce((sum, item) => sum + item.lineTotal, 0);
  }

  function itemLines(target) {
    const items = selectedItems(target);
    if (!items.length) return ['  Chưa chọn món'];
    return items.map((item) => `  ${item.text}`);
  }

  function trimBlankTail(lines) {
    const next = [...lines];
    while (next.length && String(next[next.length - 1]).trim() === '') next.pop();
    return next.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function buildBranchCopyText() {
    const type = selectedValue('order_type') || 'delivery';
    const items = selectedItems('branch');
    const showTotal = boolPref('copy_branch_show_total', true);
    const name = field('customer_name');
    const phone = field('phone');
    const address = field('address');
    const branch = selectedText('branch_id', 'Chưa chọn');
    const receiveTime = field('receive_time');

    if (type === 'booking') {
      const lines = [
        'ĐƠN ĐẶT BÀN',
        '',
        `• Tên: ${name}`,
        phone ? `• SĐT: ${phone}` : '',
        `• Chi nhánh: ${branch}`,
        `• Số lượng: ${field('guest_count') || '0'} khách`,
        `• Thời gian: ${receiveTime || 'Chưa nhập'}`,
        field('note') ? `• Ghi chú: ${field('note')}` : '',
        ...branchNoticeLines()
      ];
      return trimBlankTail(lines.filter((line) => line !== ''));
    }

    if (type === 'pickup') {
      const lines = [
        'ĐƠN GHÉ LẤY',
        '',
        `• Tên: ${name}`,
        phone ? `• SĐT: ${phone}` : '',
        `• Chi nhánh: ${branch}`,
        '• Món:',
        ...itemLines('branch'),
        showTotal ? `=> Tổng tiền: ${money(total(items))}` : '',
        `• Thời gian ghé lấy: ${receiveTime || 'Chưa nhập'}`,
        ...branchNoticeLines()
      ];
      return trimBlankTail(lines.filter((line) => line !== ''));
    }

    const lines = [
      'ĐƠN MANG VỀ',
      '',
      `• Tên: ${name}`,
      `• SĐT: ${phone}`,
      `• Địa chỉ: ${address}`,
      '• Món:',
      ...itemLines('branch'),
      showTotal ? `=> Tổng tiền: ${money(total(items))}` : '',
      `• Thời gian giao: ${receiveTime || 'Giao ngay'}`,
      ...branchNoticeLines()
    ];
    return trimBlankTail(lines.filter((line) => line !== ''));
  }

  function buildCustomerCopyText() {
    const type = selectedValue('order_type') || 'delivery';
    const items = selectedItems('customer');
    const showTotal = boolPref('copy_customer_show_total', true);
    const name = field('customer_name');
    const phone = field('phone');
    const address = field('address');
    const branch = selectedText('branch_id', 'Chưa chọn');
    const receiveTime = field('receive_time');
    const payment = selectedText('payment_method_id', 'Chưa chọn');

    if (type === 'booking') {
      const lines = [
        'XÁC NHẬN ĐƠN ĐẶT BÀN',
        '',
        `• Chi nhánh: ${branch}`,
        `• Tên: ${name}`,
        phone ? `• SĐT: ${phone}` : '',
        `• Số lượng: ${field('guest_count') || '0'} khách`,
        `• Thời gian: ${receiveTime || 'Chưa nhập'}`,
        field('note') ? `• Ghi chú: ${field('note')}` : ''
      ];
      return trimBlankTail(lines.filter((line) => line !== ''));
    }

    if (type === 'pickup') {
      const lines = [
        'XÁC NHẬN ĐƠN GHÉ LẤY',
        '',
        `• Chi nhánh: ${branch}`,
        `• Tên: ${name}`,
        phone ? `• SĐT: ${phone}` : '',
        '• Món:',
        ...itemLines('customer'),
        showTotal ? `=> Tổng: ${money(total(items))}` : '',
        `• Thời gian ghé lấy: ${receiveTime || 'Chưa nhập'}`,
        `• Hình thức thanh toán: ${payment}`
      ];
      return trimBlankTail(lines.filter((line) => line !== ''));
    }

    const lines = [
      'XÁC NHẬN ĐƠN MANG VỀ',
      '',
      `• Chi nhánh: ${branch}`,
      `• Tên: ${name}`,
      `• SĐT: ${phone}`,
      `• Địa chỉ: ${address}`,
      '• Món:',
      ...itemLines('customer'),
      showTotal ? `=> Tổng: ${money(total(items))}` : '',
      `• Thời gian nhận: ${receiveTime || 'Giao ngay'}`,
      `• Hình thức thanh toán: ${payment}`
    ];
    return trimBlankTail(lines.filter((line) => line !== ''));
  }

  function updatePreview() {
    const preview = $('[data-order-preview]', form);
    if (!preview || form.dataset.workspaceApplying === '1') return '';
    const text = buildBranchCopyText();
    if (preview.value !== text) preview.value = text;
    return text;
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

  function feedback(message, tone = 'info') {
    const actions = $('.cart-panel .primary-actions', form);
    if (!actions) return;
    let node = $('[data-order-copy-feedback]', form);
    if (!node) {
      node = document.createElement('div');
      node.dataset.orderCopyFeedback = '1';
      node.className = 'order-copy-feedback is-info';
      actions.insertAdjacentElement('afterend', node);
    }
    node.className = `order-copy-feedback is-${tone}`;
    node.textContent = message;
  }

  function prepareCustomerButtons() {
    $$('[data-copy-customer]', form).forEach((button) => {
      button.dataset.copyCustomerTemplate = '1';
      button.removeAttribute('data-copy-customer');
    });
  }

  function queuePreviewUpdate() {
    if (previewQueued) return;
    previewQueued = true;
    window.requestAnimationFrame(() => {
      previewQueued = false;
      updatePreview();
    });
  }

  window.OrderCopyTemplates = {
    branch: buildBranchCopyText,
    customer: buildCustomerCopyText,
    updatePreview,
    money
  };

  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('[data-copy-preview][data-submit-status-after-copy]')) updatePreview();
    if (event.target.closest('[data-copy-customer-template]')) updatePreview();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.closest('[data-copy-preview][data-submit-status-after-copy], [data-copy-customer-template]')) updatePreview();
  }, true);

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy-customer-template]');
    if (!button || !form.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const copied = await copyText(buildCustomerCopyText());
    feedback(copied ? 'Đã copy nội dung gửi khách hàng.' : 'Không copy được nội dung gửi khách. Hãy copy thủ công.', copied ? 'success' : 'error');
  }, true);

  form.addEventListener('input', queuePreviewUpdate, true);
  form.addEventListener('change', queuePreviewUpdate, true);
  document.addEventListener('order-workspace:loaded', () => {
    prepareCustomerButtons();
    window.requestAnimationFrame(updatePreview);
  }, true);

  prepareCustomerButtons();
  window.requestAnimationFrame(updatePreview);
})();
