(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`;
  const csrf = () => document.querySelector("input[name='_csrf']")?.value || '';

  function injectSmoothWorkspaceCss() {
    if (document.querySelector('[data-order-workspace-smooth-css]')) return;
    const style = document.createElement('style');
    style.dataset.orderWorkspaceSmoothCss = '1';
    style.textContent = '.order-workspace-form.is-workspace-loading{opacity:1!important;filter:none!important}.order-workspace-form.is-workspace-loading::after{content:none!important;display:none!important}.order-workspace-form [data-menu-panel],.order-workspace-form .cart-panel{transition:none!important}.open-order-card [data-copy-target]{display:none!important}';
    document.head.appendChild(style);
  }

  function removeCardCopyButtons() {
    $$('.open-order-card [data-copy-target]').forEach((button) => button.remove());
  }

  function toast(message) {
    const root = $('#toast-root');
    if (!root) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    root.appendChild(node);
    setTimeout(() => node.remove(), 2400);
  }

  async function json(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Không xử lý được yêu cầu.');
    return payload;
  }

  function setStatus(text, tone) {
    const node = $('[data-draft-sync-status]');
    if (!node) return;
    node.textContent = text;
    node.dataset.autosaveTone = tone || '';
  }

  function setRadio(form, name, value) {
    const input = form.querySelector(`[name="${name}"][value="${CSS.escape(String(value || ''))}"]`);
    if (input) input.checked = true;
  }

  function fillForm(data) {
    const form = $('[data-order-create]');
    if (!form) return;
    const order = data.order || {};
    const payload = data.payload || {};

    form.dataset.orderEditing = '1';
    form.dataset.currentOrderId = String(order.id || 0);
    form.dataset.editOrderCode = order.order_code || '';
    form.classList.remove('is-workspace-hidden');
    form.classList.remove('is-workspace-loading');
    $('[data-order-empty-workspace]')?.classList.add('is-hidden');

    const editInput = $('[data-edit-order-id]', form);
    if (editInput) editInput.value = String(order.id || 0);
    const title = $('[data-workspace-title]', form);
    if (title) title.textContent = `Làm tiếp đơn ${order.order_code || '#' + (order.id || '')}`;

    setRadio(form, 'order_type', payload.order_type || 'delivery');
    setRadio(form, 'source_id', payload.source_id || '');
    ['customer_name', 'phone', 'address', 'receive_time', 'guest_count', 'note'].forEach((name) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) input.value = payload[name] || '';
    });
    const branch = form.querySelector('[name="branch_id"]');
    if (branch) branch.value = String(payload.branch_id || '');
    const payment = form.querySelector('[name="payment_method_id"]');
    if (payment) payment.value = String(payload.payment_method_id || '');
    $$('[name="quick_notices[]"]', form).forEach((input) => input.checked = (payload.quick_notices || []).includes(input.value));
    $$('[name^="items["]', form).forEach((input) => input.value = '0');
    Object.entries(payload.items || {}).forEach(([id, qty]) => {
      const input = form.querySelector(`[name="items[${CSS.escape(String(id))}]"]`);
      if (input) input.value = String(qty || 0);
    });
    $$('[name^="item_notes["]', form).forEach((input) => input.value = '');
    Object.entries(payload.item_notes || {}).forEach(([id, note]) => {
      const input = form.querySelector(`[name="item_notes[${CSS.escape(String(id))}]"]`);
      if (input) input.value = note || '';
    });

    $('[data-active-draft-code]') && ($('[data-active-draft-code]').textContent = order.order_code || 'Đang làm');
    $('[data-active-draft-info]') && ($('[data-active-draft-info]').textContent = 'Đơn đang xử lý. Thay đổi sẽ tự lưu.');
    setStatus('Đã mở đơn, không tải lại trang.', 'idle');

    $$('[data-open-order-card]').forEach((card) => {
      const active = String(card.dataset.orderId || '') === String(order.id || '');
      card.classList.toggle('is-editing', active);
      const label = $('[data-open-order-status]', card);
      if (label) label.textContent = active ? 'Đang làm' : (card.classList.contains('is-sent') ? 'Đã gửi CN' : 'Đang xử lý');
    });

    history.replaceState({}, '', `/orders/create?edit_order_id=${order.id || ''}`);
    form.dispatchEvent(new Event('change', { bubbles: true }));
    form.dispatchEvent(new CustomEvent('order-workspace:loaded', { bubbles: true, detail: data }));
    removeCardCopyButtons();
  }

  function addOrUpdateCard(data) {
    const order = data.order || {};
    let card = document.querySelector(`[data-open-order-card][data-order-id="${CSS.escape(String(order.id || ''))}"]`);
    if (!card) {
      $('[data-open-order-empty]')?.remove();
      const completeId = `active-order-complete-${order.id}`;
      const reopenId = `active-order-reopen-${order.id}`;
      $('[data-open-order-list]')?.insertAdjacentHTML('afterbegin', `<article class="open-order-card is-processing" data-open-order-card data-order-id="${order.id}" data-edit-data-url="/orders/${order.id}/edit-data" data-open-order-url="/orders/create?edit_order_id=${order.id}"><div class="open-order-main"><a href="/orders/${order.id}">${order.order_code}</a><span data-open-order-status>Đang xử lý</span></div><div class="open-order-meta" data-open-order-meta>Chưa nhập tên<br>${order.branch_name || 'Chưa CN'} | ${order.source_name || 'Chưa nguồn'}</div><div class="open-order-bottom"><b data-open-order-total>${money(order.total)}</b><div class="open-order-actions"><button class="btn ghost open-order-edit-btn is-hidden" type="submit" form="${reopenId}" title="Sửa lại đơn đã gửi CN">✎</button><button class="btn complete" type="submit" form="${completeId}">Hoàn thành</button></div></div><small class="open-order-hint" data-open-order-hint>Click card để làm tiếp</small></article>`);
      $('[data-open-order-forms]')?.insertAdjacentHTML('beforeend', `<form id="${completeId}" class="active-order-complete-form" method="post" action="/orders/${order.id}/status"><input type="hidden" name="_csrf" value="${csrf()}"><input type="hidden" name="workflow_status" value="completed"></form><form id="${reopenId}" class="active-order-reopen-form" method="post" action="/orders/${order.id}/reopen-edit-json"><input type="hidden" name="_csrf" value="${csrf()}"></form>`);
      card = document.querySelector(`[data-open-order-card][data-order-id="${CSS.escape(String(order.id))}"]`);
    }
    if (card) {
      card.classList.remove('is-sent');
      card.classList.add('is-processing');
      $('.open-order-edit-btn', card)?.classList.add('is-hidden');
      removeCardCopyButtons();
    }
  }

  document.addEventListener('click', async (event) => {
    const card = event.target.closest('[data-open-order-card].is-processing');
    if (!card || event.target.closest('a, button, input, textarea, select, form')) return;
    event.preventDefault();
    try {
      setStatus('Đang mở đơn...', 'saving');
      fillForm(await json(card.dataset.editDataUrl));
    } catch (error) {
      toast(error.message);
      setStatus('Không mở được đơn.', 'error');
    }
  }, true);

  document.addEventListener('submit', async (event) => {
    const newForm = event.target.closest('[data-new-processing-form]');
    if (newForm) {
      event.preventDefault();
      try {
        setStatus('Đang tạo đơn...', 'saving');
        const data = await json(newForm.action, { method: 'POST', body: new FormData(newForm) });
        addOrUpdateCard(data);
        fillForm(data);
        toast('Đã tạo đơn đang xử lý');
      } catch (error) { toast(error.message); setStatus('Không tạo được đơn.', 'error'); }
      return;
    }

    const reopenForm = event.target.closest('.active-order-reopen-form');
    if (!reopenForm) return;
    event.preventDefault();
    if (!window.confirm('Đơn này đã gửi CN. Sửa lại sẽ chuyển về Đang xử lý và cần Copy gửi CN lại. Tiếp tục?')) return;
    try {
      setStatus('Đang chuyển về Đang xử lý...', 'saving');
      const data = await json(reopenForm.action, { method: 'POST', body: new FormData(reopenForm) });
      addOrUpdateCard(data);
      fillForm(data);
      toast('Đã chuyển về Đang xử lý để sửa lại');
    } catch (error) { toast(error.message); setStatus('Không sửa lại được đơn.', 'error'); }
  }, true);

  injectSmoothWorkspaceCss();
  removeCardCopyButtons();
})();
