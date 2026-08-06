(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`;
  const csrf = () => document.querySelector("input[name='_csrf']")?.value || '';
  const orderCache = new Map();
  const inflight = new Map();

  function injectSmoothWorkspaceCss() {
    if (document.querySelector('[data-order-workspace-smooth-css]')) return;
    const style = document.createElement('style');
    style.dataset.orderWorkspaceSmoothCss = '1';
    style.textContent = '.order-workspace-form.is-workspace-loading{opacity:1!important;filter:none!important}.order-workspace-form.is-workspace-loading::after{content:none!important;display:none!important}.order-workspace-form [data-menu-panel],.order-workspace-form .cart-panel{transition:none!important}.open-order-card [data-copy-target]{display:none!important}.open-order-card.is-prefetching{box-shadow:0 0 0 2px rgba(34,197,94,.08),0 8px 18px rgba(15,23,42,.04)}';
    document.head.appendChild(style);
  }

  function optimizeMenuImages() {
    $$('.dish-thumb img').forEach((img) => {
      img.loading = img.loading || 'lazy';
      img.decoding = img.decoding || 'async';
      if (!img.width) img.width = 80;
      if (!img.height) img.height = 80;
    });
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

  function setValueIfChanged(input, value) {
    if (!input) return;
    const next = String(value ?? '');
    if (input.value !== next) input.value = next;
  }

  function setRadio(form, name, value) {
    const input = form.querySelector(`[name="${name}"][value="${CSS.escape(String(value || ''))}"]`);
    if (input && !input.checked) input.checked = true;
  }

  function orderIdFromCard(card) {
    return String(card?.dataset.orderId || '');
  }

  function cacheOrderPayload(data) {
    const id = String(data?.order?.id || '');
    if (id) orderCache.set(id, data);
    return data;
  }

  async function fetchOrderData(card, { force = false } = {}) {
    const id = orderIdFromCard(card);
    if (!id || !card?.dataset.editDataUrl) throw new Error('Không có dữ liệu đơn.');
    if (!force && orderCache.has(id)) return orderCache.get(id);
    if (inflight.has(id)) return inflight.get(id);

    card.classList.add('is-prefetching');
    const request = json(card.dataset.editDataUrl)
      .then(cacheOrderPayload)
      .finally(() => {
        inflight.delete(id);
        card.classList.remove('is-prefetching');
      });
    inflight.set(id, request);
    return request;
  }

  function prefetchCard(card) {
    if (!card || !card.classList.contains('is-processing')) return;
    if (orderCache.has(orderIdFromCard(card))) return;
    fetchOrderData(card).catch(() => {});
  }

  function applyScalarFields(form, payload) {
    setRadio(form, 'order_type', payload.order_type || 'delivery');
    setRadio(form, 'source_id', payload.source_id || '');
    ['customer_name', 'phone', 'address', 'receive_time', 'guest_count', 'note'].forEach((name) => {
      setValueIfChanged(form.querySelector(`[name="${name}"]`), payload[name] || '');
    });
    setValueIfChanged(form.querySelector('[name="branch_id"]'), payload.branch_id || '');
    setValueIfChanged(form.querySelector('[name="payment_method_id"]'), payload.payment_method_id || '');

    const notices = new Set((payload.quick_notices || []).map(String));
    $$('[name="quick_notices[]"]', form).forEach((input) => {
      const checked = notices.has(input.value);
      if (input.checked !== checked) input.checked = checked;
    });
  }

  function applyItemsDiff(form, payload) {
    const nextItems = payload.items || {};
    const nextNotes = payload.item_notes || {};
    const itemIdsToTouch = new Set(Object.keys(nextItems).map(String));
    const noteIdsToTouch = new Set(Object.keys(nextNotes).map(String));

    $$('[name^="items["]', form).forEach((input) => {
      const match = input.name.match(/^items\[(.+)]$/);
      const id = match ? String(match[1]) : '';
      const hasCurrentValue = Number(input.value || 0) !== 0;
      if (!id || (!hasCurrentValue && !itemIdsToTouch.has(id))) return;
      setValueIfChanged(input, nextItems[id] || 0);
    });

    $$('[name^="item_notes["]', form).forEach((input) => {
      const match = input.name.match(/^item_notes\[(.+)]$/);
      const id = match ? String(match[1]) : '';
      const hasCurrentNote = String(input.value || '').trim() !== '';
      if (!id || (!hasCurrentNote && !noteIdsToTouch.has(id))) return;
      setValueIfChanged(input, nextNotes[id] || '');
      const card = input.closest('[data-menu-card]');
      if (card) card.classList.toggle('has-note', String(input.value || '').trim() !== '');
    });
  }

  function updateOpenOrderCards(order) {
    $$('[data-open-order-card]').forEach((card) => {
      const active = String(card.dataset.orderId || '') === String(order.id || '');
      card.classList.toggle('is-editing', active);
      const label = $('[data-open-order-status]', card);
      if (label) label.textContent = active ? 'Đang làm' : (card.classList.contains('is-sent') ? 'Đã gửi CN' : 'Đang xử lý');
    });
  }

  function fillForm(data) {
    const form = $('[data-order-create]');
    if (!form) return;
    const order = data.order || {};
    const payload = data.payload || {};

    form.dataset.workspaceApplying = '1';
    form.dataset.orderEditing = '1';
    form.dataset.currentOrderId = String(order.id || 0);
    form.dataset.editOrderCode = order.order_code || '';
    form.classList.remove('is-workspace-hidden');
    form.classList.remove('is-workspace-loading');
    $('[data-order-empty-workspace]')?.classList.add('is-hidden');

    setValueIfChanged($('[data-edit-order-id]', form), order.id || 0);
    const title = $('[data-workspace-title]', form);
    if (title) title.textContent = `Làm tiếp đơn ${order.order_code || '#' + (order.id || '')}`;

    applyScalarFields(form, payload);
    applyItemsDiff(form, payload);

    $('[data-active-draft-code]') && ($('[data-active-draft-code]').textContent = order.order_code || 'Đang làm');
    $('[data-active-draft-info]') && ($('[data-active-draft-info]').textContent = 'Đơn đang xử lý. Thay đổi sẽ tự lưu.');
    setStatus('Đã mở đơn, không tải lại trang.', 'idle');
    updateOpenOrderCards(order);

    history.replaceState({}, '', `/orders/create?edit_order_id=${order.id || ''}`);
    form.dispatchEvent(new Event('change', { bubbles: true }));
    window.requestAnimationFrame(() => {
      form.dataset.workspaceApplying = '';
      form.dispatchEvent(new CustomEvent('order-workspace:loaded', { bubbles: true, detail: data }));
    });
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
      orderCache.set(String(order.id || ''), data);
      removeCardCopyButtons();
    }
  }

  document.addEventListener('pointerenter', (event) => prefetchCard(event.target.closest?.('[data-open-order-card]')), true);
  document.addEventListener('focusin', (event) => prefetchCard(event.target.closest?.('[data-open-order-card]')), true);
  document.addEventListener('touchstart', (event) => prefetchCard(event.target.closest?.('[data-open-order-card]')), { passive: true, capture: true });

  document.addEventListener('click', async (event) => {
    const card = event.target.closest('[data-open-order-card].is-processing');
    if (!card || event.target.closest('a, button, input, textarea, select, form')) return;
    event.preventDefault();
    try {
      setStatus(orderCache.has(orderIdFromCard(card)) ? 'Đang mở đơn từ bộ nhớ...' : 'Đang mở đơn...', 'saving');
      fillForm(await fetchOrderData(card));
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
        const data = cacheOrderPayload(await json(newForm.action, { method: 'POST', body: new FormData(newForm) }));
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
      const data = cacheOrderPayload(await json(reopenForm.action, { method: 'POST', body: new FormData(reopenForm) }));
      addOrUpdateCard(data);
      fillForm(data);
      toast('Đã chuyển về Đang xử lý để sửa lại');
    } catch (error) { toast(error.message); setStatus('Không sửa lại được đơn.', 'error'); }
  }, true);

  injectSmoothWorkspaceCss();
  optimizeMenuImages();
  removeCardCopyButtons();
})();
