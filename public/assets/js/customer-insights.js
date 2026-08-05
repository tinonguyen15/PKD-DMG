(function () {
  const form = document.querySelector('[data-order-create]');
  if (!form) return;

  const phoneInput = form.querySelector('[data-customer-phone]');
  const panel = form.querySelector('[data-customer-insight]');
  if (!phoneInput || !panel || !form.dataset.customerLookupUrl) return;

  const $ = (selector, root = panel) => root.querySelector(selector);
  const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const title = $('[data-customer-title]');
  const status = $('[data-customer-status]');
  const warning = $('[data-customer-warning]');
  const metrics = $('[data-customer-metrics]');
  const last = $('[data-customer-last]');
  const orders = $('[data-customer-orders]');
  const fillButton = $('[data-customer-fill]');
  const addButton = $('[data-customer-blacklist-add]');
  const removeButton = $('[data-customer-blacklist-remove]');
  const reasonInput = $('[data-customer-blacklist-reason]');

  let lastPayload = null;
  let lookupTimer = null;
  let abortController = null;

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function normalizedPhone(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  function dateText(value) {
    if (!value) return '-';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function statusLabel(value) {
    return { processing: 'Xử lý', sent: 'Đã gửi', completed: 'Hoàn', cancelled: 'Hủy' }[value] || value || '-';
  }

  function orderTypeLabel(value) {
    return { delivery: 'Mang về', pickup: 'Ghé lấy', booking: 'Đặt bàn' }[value] || value || '';
  }

  function itemSummary(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    if (!items.length) return 'Chưa có món';
    const names = items.slice(0, 2).map((item) => `${Number(item.quantity || 0)} ${item.customer_name || item.item_name || 'món'}`);
    return `${names.join(', ')}${items.length > 2 ? ` +${items.length - 2}` : ''}`;
  }

  function setLoading() {
    panel.hidden = false;
    panel.classList.remove('is-danger', 'is-good', 'is-empty');
    panel.classList.add('is-loading');
    if (status) status.textContent = 'Đang check';
    if (title) title.textContent = 'Lịch sử khách';
    if (warning) warning.hidden = true;
    if (metrics) metrics.innerHTML = '<span class="customer-skeleton"></span><span class="customer-skeleton"></span>';
    if (last) last.innerHTML = '';
    if (orders) orders.innerHTML = '';
  }

  function hidePanel() {
    panel.hidden = true;
    lastPayload = null;
  }

  function render(payload) {
    lastPayload = payload;
    const customer = payload.customer || {};
    const summary = payload.summary || {};
    const recentOrders = Array.isArray(payload.recent_orders) ? payload.recent_orders : [];
    const isBlacklisted = Boolean(customer.is_blacklisted);
    const totalOrders = Number(summary.total_orders || 0);
    const cancelledOrders = Number(summary.cancelled_orders || 0);
    const completedOrders = Number(summary.completed_orders || 0);
    const cancelRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;
    const customerName = customer.name || summary.last_customer_name || 'Chưa có tên';
    const customerAddress = customer.address || summary.last_address || '';

    panel.hidden = false;
    panel.classList.remove('is-loading', 'is-danger', 'is-good', 'is-empty');
    panel.classList.add(isBlacklisted ? 'is-danger' : (totalOrders > 0 ? 'is-good' : 'is-empty'));

    if (status) status.textContent = isBlacklisted ? 'Blacklist' : (totalOrders > 0 ? 'Khách quen' : 'Khách mới');
    if (title) title.textContent = isBlacklisted ? 'Cảnh báo khách' : 'Lịch sử khách';

    if (warning) {
      if (isBlacklisted) {
        warning.hidden = false;
        warning.innerHTML = `<strong>⚠ Blacklist</strong><span>${escapeHtml(customer.blacklist_reason || 'Kiểm tra kỹ trước khi nhận đơn.')}</span>`;
      } else if (cancelledOrders >= 1 && cancelRate >= 50) {
        warning.hidden = false;
        warning.innerHTML = `<strong>⚠ Hủy cao</strong><span>${cancelledOrders}/${totalOrders} đơn (${cancelRate}%). Xác nhận kỹ.</span>`;
      } else {
        warning.hidden = true;
        warning.innerHTML = '';
      }
    }

    if (metrics) {
      metrics.innerHTML = `
        <article><span>Đơn</span><strong>${totalOrders}</strong></article>
        <article><span>Hoàn</span><strong>${completedOrders}</strong></article>
        <article><span>Hủy</span><strong>${cancelledOrders}</strong></article>
        <article><span>DT hoàn</span><strong>${money(summary.completed_revenue || 0)}</strong></article>
      `;
    }

    if (last) {
      if (totalOrders > 0 || customer.name || customer.address) {
        last.innerHTML = `
          <div><span>Khách</span><strong>${escapeHtml(customerName)}</strong></div>
          <div><span>Gần nhất</span><strong>${escapeHtml(dateText(summary.last_order_at))}</strong></div>
          <div class="wide"><span>CN/Nguồn</span><strong>${escapeHtml([summary.last_branch_name, summary.last_source_name].filter(Boolean).join(' · ') || '-')}</strong></div>
          ${customerAddress ? `<div class="wide"><span>Địa chỉ</span><strong>${escapeHtml(customerAddress)}</strong></div>` : ''}
        `;
      } else {
        last.innerHTML = '<p class="empty small">Chưa có đơn cũ.</p>';
      }
    }

    if (orders) {
      orders.innerHTML = recentOrders.length
        ? `<strong class="customer-orders-title">Đơn gần đây</strong>${recentOrders.map((order) => {
            const hasReusableItems = Array.isArray(order.items) && order.items.some((item) => Number(item.menu_item_id || 0) > 0 && Number(item.quantity || 0) > 0);
            return `
              <div class="customer-order-row">
                <a class="customer-order-main" href="/orders/${Number(order.id)}" target="_blank" rel="noopener">
                  <span>
                    <b>${escapeHtml(order.order_code)}</b>
                    <small>${escapeHtml(dateText(order.created_at))} · ${escapeHtml(orderTypeLabel(order.order_type))} · ${escapeHtml(order.branch_name || 'Chưa CN')}</small>
                    <i>${escapeHtml(itemSummary(order))}</i>
                  </span>
                </a>
                <em class="status-${escapeHtml(order.workflow_status)}">${escapeHtml(statusLabel(order.workflow_status))}</em>
                <strong>${money(order.total || 0)}</strong>
                <button class="btn ghost small-btn reuse-items-btn" type="button" data-reuse-order="${Number(order.id)}" ${hasReusableItems ? '' : 'disabled'}>Dùng món</button>
              </div>
            `;
          }).join('')}`
        : '';
    }

    if (fillButton) {
      fillButton.textContent = 'Dùng thông tin';
      fillButton.hidden = !(customer.name || summary.last_customer_name || customer.address || summary.last_address);
    }
    if (addButton) addButton.hidden = isBlacklisted;
    if (removeButton) removeButton.hidden = !isBlacklisted;
    if (reasonInput) {
      reasonInput.value = isBlacklisted ? (customer.blacklist_reason || '') : '';
      reasonInput.placeholder = isBlacklisted ? 'Lý do blacklist' : 'Lý do blacklist';
    }
  }

  async function lookup(phone) {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const url = new URL(form.dataset.customerLookupUrl, window.location.origin);
    url.searchParams.set('phone', phone);
    const response = await fetch(url.toString(), {
      credentials: 'same-origin',
      signal: abortController.signal,
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Không tra cứu được khách hàng');
    return payload;
  }

  function scheduleLookup() {
    const rawPhone = phoneInput.value.trim();
    const digits = normalizedPhone(rawPhone);
    if (lookupTimer) clearTimeout(lookupTimer);
    if (digits.length < 8) {
      hidePanel();
      return;
    }
    setLoading();
    lookupTimer = setTimeout(() => {
      lookup(rawPhone).then(render).catch((error) => {
        if (error.name === 'AbortError') return;
        panel.hidden = false;
        panel.classList.remove('is-loading', 'is-good', 'is-empty');
        panel.classList.add('is-danger');
        if (status) status.textContent = 'Lỗi';
        if (title) title.textContent = error.message || 'Không tra cứu được';
        if (metrics) metrics.innerHTML = '';
        if (last) last.innerHTML = '';
        if (orders) orders.innerHTML = '';
      });
    }, 420);
  }

  async function setBlacklist(isBlacklisted) {
    const rawPhone = phoneInput.value.trim();
    const digits = normalizedPhone(rawPhone);
    if (digits.length < 8 || !form.dataset.customerBlacklistUrl) return;
    const formData = new FormData();
    const csrf = form.querySelector("[name='_csrf']")?.value || '';
    formData.append('_csrf', csrf);
    formData.append('phone', rawPhone);
    formData.append('is_blacklisted', isBlacklisted ? '1' : '0');
    formData.append('reason', isBlacklisted ? (reasonInput?.value || '') : '');

    const response = await fetch(form.dataset.customerBlacklistUrl, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Không cập nhật được blacklist');
    render(payload);
  }

  function setRadioValue(name, value) {
    const input = form.querySelector(`[name="${name}"][value="${CSS.escape(String(value))}"]`);
    if (!input) return false;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function reuseOrderItems(orderId) {
    const order = (lastPayload?.recent_orders || []).find((item) => Number(item.id) === Number(orderId));
    const items = Array.isArray(order?.items) ? order.items : [];
    if (!items.length) {
      alert('Đơn cũ này chưa có dữ liệu món.');
      return;
    }

    setRadioValue('order_type', ['delivery', 'pickup'].includes(order.order_type) ? order.order_type : 'delivery');

    form.querySelectorAll("[name^='items[']").forEach((input) => { input.value = '0'; });
    form.querySelectorAll("[name^='item_notes[']").forEach((input) => { input.value = ''; });

    let applied = 0;
    const grouped = new Map();
    items.forEach((item) => {
      const id = Number(item.menu_item_id || 0);
      const quantity = Number(item.quantity || 0);
      if (id <= 0 || quantity <= 0) return;
      const current = grouped.get(id) || { quantity: 0, note: '' };
      current.quantity += quantity;
      if (item.item_note) current.note = item.item_note;
      grouped.set(id, current);
    });

    grouped.forEach((value, id) => {
      const quantityInput = form.querySelector(`[name="items[${CSS.escape(String(id))}]"]`);
      if (!quantityInput) return;
      quantityInput.value = String(value.quantity);
      const noteInput = form.querySelector(`[name="item_notes[${CSS.escape(String(id))}]"]`);
      if (noteInput && value.note) noteInput.value = value.note;
      applied += 1;
    });

    form.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('change', { bubbles: true }));
    alert(applied > 0 ? `Đã dùng lại ${applied} món.` : 'Món cũ không còn khớp menu hiện tại.');
  }

  phoneInput.addEventListener('input', scheduleLookup);
  phoneInput.addEventListener('change', scheduleLookup);

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('[data-reuse-order]');
    if (!button) return;
    event.preventDefault();
    reuseOrderItems(button.dataset.reuseOrder);
  });

  fillButton?.addEventListener('click', () => {
    if (!lastPayload) return;
    const customer = lastPayload.customer || {};
    const summary = lastPayload.summary || {};
    const name = customer.name || summary.last_customer_name || '';
    const address = customer.address || summary.last_address || '';
    const nameInput = form.querySelector("[name='customer_name']");
    const addressInput = form.querySelector("[name='address']");
    if (nameInput && name) nameInput.value = name;
    if (addressInput && address) addressInput.value = address;
    nameInput?.dispatchEvent(new Event('input', { bubbles: true }));
    addressInput?.dispatchEvent(new Event('input', { bubbles: true }));
  });

  addButton?.addEventListener('click', async () => {
    try { await setBlacklist(true); } catch (error) { alert(error.message || 'Không thêm được blacklist'); }
  });

  removeButton?.addEventListener('click', async () => {
    try { await setBlacklist(false); } catch (error) { alert(error.message || 'Không gỡ được blacklist'); }
  });

  if (normalizedPhone(phoneInput.value).length >= 8) {
    scheduleLookup();
  }
})();
