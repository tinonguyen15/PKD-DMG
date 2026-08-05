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
  const blacklistActions = panel.querySelector('.customer-blacklist-actions');

  let lastPayload = null;
  let lookupTimer = null;
  let abortController = null;

  if (blacklistActions) {
    blacklistActions.hidden = true;
  }
  if (addButton) addButton.hidden = true;
  if (removeButton) removeButton.hidden = true;
  if (reasonInput) reasonInput.disabled = true;

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function safeCss(value) {
    return window.CSS && CSS.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function normalizedPhone(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  function dateText(value) {
    if (!value) return 'Chưa có';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function statusLabel(value) {
    return {
      processing: 'Đang xử lý',
      sent: 'Đã gửi CN',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy'
    }[value] || value || 'Không rõ';
  }

  function orderTypeLabel(value) {
    return {
      delivery: 'Mang về',
      pickup: 'Ghé lấy',
      booking: 'Đặt bàn'
    }[value] || value || '';
  }

  function itemSummary(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    if (!items.length) return 'Chưa có dữ liệu món';
    const names = items.slice(0, 3).map((item) => `${Number(item.quantity || 0)} ${item.customer_name || item.item_name || 'món'}`);
    return `${names.join(', ')}${items.length > 3 ? ` +${items.length - 3} món` : ''}`;
  }

  function setLoading() {
    panel.hidden = false;
    panel.classList.remove('is-danger', 'is-good', 'is-empty');
    panel.classList.add('is-loading');
    if (status) status.textContent = 'Đang tra';
    if (title) title.textContent = 'Đang kiểm tra khách...';
    if (warning) warning.hidden = true;
    if (metrics) metrics.innerHTML = '<span class="customer-skeleton"></span><span class="customer-skeleton"></span><span class="customer-skeleton"></span>';
    if (last) last.innerHTML = '';
    if (orders) orders.innerHTML = '';
  }

  function hidePanel() {
    panel.hidden = true;
    lastPayload = null;
  }

  function blacklistBlock(blacklist) {
    const events = Array.isArray(blacklist?.events) ? blacklist.events : [];
    const activeCount = Number(blacklist?.active_count || 0);
    if (!events.length) return '';

    return `
      <details class="customer-blacklist-history" ${activeCount > 0 ? 'open' : ''}>
        <summary>
          <b>Blacklist: ${activeCount} đơn</b>
          <span>${escapeHtml(blacklist.latest_reason || 'Bấm để xem chi tiết')}</span>
        </summary>
        <div class="customer-blacklist-events">
          ${events.map((event) => `
            <a class="customer-blacklist-event" href="/orders/${Number(event.order_id || 0)}" target="_blank" rel="noopener">
              <span>
                <strong>${escapeHtml(event.order_code || `Đơn #${Number(event.order_id || 0)}`)}</strong>
                <small>${escapeHtml(dateText(event.added_at))} · ${escapeHtml(event.added_by_name || 'Không rõ')}</small>
                <em>${escapeHtml(event.reason || 'Chưa ghi lý do')}</em>
              </span>
              <b>${money(event.order_total || 0)}</b>
            </a>
          `).join('')}
        </div>
      </details>
    `;
  }

  function recentOrdersBlock(recentOrders) {
    if (!recentOrders.length) return '';

    return `<strong class="customer-orders-title">Đơn gần đây</strong>${recentOrders.map((order) => {
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
    }).join('')}`;
  }

  function render(payload) {
    lastPayload = payload;
    const customer = payload.customer || {};
    const summary = payload.summary || {};
    const recentOrders = Array.isArray(payload.recent_orders) ? payload.recent_orders : [];
    const blacklist = payload.blacklist || {};
    const blacklistCount = Number(blacklist.active_count || 0);
    const totalOrders = Number(summary.total_orders || 0);
    const cancelledOrders = Number(summary.cancelled_orders || 0);
    const completedOrders = Number(summary.completed_orders || 0);
    const cancelRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;

    panel.hidden = false;
    panel.classList.remove('is-loading', 'is-danger', 'is-good', 'is-empty');
    panel.classList.add(blacklistCount > 0 ? 'is-danger' : (totalOrders > 0 ? 'is-good' : 'is-empty'));

    if (status) status.textContent = blacklistCount > 0 ? 'Cảnh báo' : (totalOrders > 0 ? 'Khách quen' : 'Khách mới');
    if (title) title.textContent = blacklistCount > 0 ? `Khách có ${blacklistCount} đơn blacklist` : (totalOrders > 0 ? 'Lịch sử khách' : 'Chưa có lịch sử');

    if (warning) {
      if (blacklistCount > 0) {
        warning.hidden = false;
        warning.innerHTML = `<strong>⚠ Có ${blacklistCount} đơn blacklist.</strong><span>${escapeHtml(blacklist.latest_reason || 'Mở chi tiết bên dưới để kiểm tra trước khi nhận đơn.')}</span>`;
      } else if (cancelledOrders >= 2 || cancelRate >= 50) {
        warning.hidden = false;
        warning.innerHTML = `<strong>⚠ Hủy cao: ${cancelledOrders}/${totalOrders} đơn (${cancelRate}%).</strong><span>Xác nhận kỹ trước khi gửi chi nhánh.</span>`;
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
          <div><span>Tên</span><strong>${escapeHtml(customer.name || summary.last_customer_name || 'Chưa có')}</strong></div>
          <div><span>Địa chỉ</span><strong>${escapeHtml(customer.address || summary.last_address || 'Chưa có')}</strong></div>
          <div><span>Lần gần nhất</span><strong>${escapeHtml(dateText(summary.last_order_at))}</strong></div>
          <div><span>CN/Nguồn</span><strong>${escapeHtml([summary.last_branch_name, summary.last_source_name].filter(Boolean).join(' · ') || 'Chưa có')}</strong></div>
        `;
      } else {
        last.innerHTML = '<p class="empty small">SĐT này chưa có đơn cũ.</p>';
      }
    }

    if (orders) {
      orders.innerHTML = `${blacklistBlock(blacklist)}${recentOrdersBlock(recentOrders)}`;
    }

    if (fillButton) {
      fillButton.hidden = !(customer.name || summary.last_customer_name || customer.address || summary.last_address);
      fillButton.textContent = 'Dùng thông tin';
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
      lookup(rawPhone)
        .then(render)
        .catch((error) => {
          if (error.name === 'AbortError') return;
          panel.hidden = false;
          panel.classList.remove('is-loading', 'is-good', 'is-empty');
          panel.classList.add('is-danger');
          if (status) status.textContent = 'Lỗi';
          if (title) title.textContent = error.message || 'Không tra cứu được khách hàng';
          if (metrics) metrics.innerHTML = '';
          if (last) last.innerHTML = '';
          if (orders) orders.innerHTML = '';
        });
    }, 420);
  }

  function setRadioValue(name, value) {
    const input = form.querySelector(`[name="${name}"][value="${safeCss(String(value))}"]`);
    if (!input) return false;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function reuseOrderItems(orderId) {
    const order = (lastPayload?.recent_orders || []).find((item) => Number(item.id) === Number(orderId));
    const items = Array.isArray(order?.items) ? order.items : [];
    if (!items.length) {
      alert('Đơn cũ này chưa có dữ liệu món để dùng lại.');
      return;
    }

    if (['delivery', 'pickup'].includes(order.order_type)) {
      setRadioValue('order_type', order.order_type);
    } else {
      setRadioValue('order_type', 'delivery');
    }

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
      const quantityInput = form.querySelector(`[name="items[${safeCss(String(id))}]"]`);
      if (!quantityInput) return;
      quantityInput.value = String(value.quantity);
      const noteInput = form.querySelector(`[name="item_notes[${safeCss(String(id))}]"]`);
      if (noteInput && value.note) noteInput.value = value.note;
      applied += 1;
    });

    form.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('change', { bubbles: true }));

    alert(applied > 0
      ? `Đã dùng lại ${applied} món từ đơn ${order.order_code || ''}.`
      : 'Các món trong đơn cũ không còn khớp menu hiện tại, không áp dụng được.'
    );
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

  if (normalizedPhone(phoneInput.value).length >= 8) {
    scheduleLookup();
  }
})();
