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
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
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
      pickup: 'Khách ghé lấy',
      booking: 'Đặt bàn'
    }[value] || value || '';
  }

  function setLoading() {
    panel.hidden = false;
    panel.classList.remove('is-danger', 'is-good', 'is-empty');
    panel.classList.add('is-loading');
    if (status) status.textContent = 'Đang tra cứu';
    if (title) title.textContent = 'Đang kiểm tra lịch sử khách hàng...';
    if (warning) warning.hidden = true;
    if (metrics) metrics.innerHTML = '<span class="customer-skeleton"></span><span class="customer-skeleton"></span><span class="customer-skeleton"></span>';
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

    panel.hidden = false;
    panel.classList.remove('is-loading', 'is-danger', 'is-good', 'is-empty');
    panel.classList.add(isBlacklisted ? 'is-danger' : (totalOrders > 0 ? 'is-good' : 'is-empty'));

    if (status) {
      status.textContent = isBlacklisted ? 'Blacklist' : (totalOrders > 0 ? 'Khách quen' : 'Khách mới');
    }
    if (title) {
      title.textContent = isBlacklisted
        ? 'Cảnh báo khách trong blacklist'
        : (totalOrders > 0 ? 'Lịch sử mua hàng của khách' : 'Chưa có lịch sử mua hàng');
    }

    if (warning) {
      if (isBlacklisted) {
        warning.hidden = false;
        warning.innerHTML = `<strong>⚠ Khách đang trong blacklist.</strong><span>${escapeHtml(customer.blacklist_reason || 'Cần kiểm tra kỹ trước khi nhận đơn.')}</span>`;
      } else if (cancelledOrders >= 2 || cancelRate >= 50) {
        warning.hidden = false;
        warning.innerHTML = `<strong>⚠ Khách có tỷ lệ hủy/boom cao.</strong><span>${cancelledOrders}/${totalOrders} đơn đã hủy (${cancelRate}%). Nên xác nhận kỹ trước khi gửi chi nhánh.</span>`;
      } else {
        warning.hidden = true;
        warning.innerHTML = '';
      }
    }

    if (metrics) {
      metrics.innerHTML = `
        <article><span>Tổng đơn</span><strong>${totalOrders}</strong></article>
        <article><span>Hoàn thành</span><strong>${completedOrders}</strong></article>
        <article><span>Đã hủy</span><strong>${cancelledOrders}</strong></article>
        <article><span>Doanh thu hoàn thành</span><strong>${money(summary.completed_revenue || 0)}</strong></article>
      `;
    }

    if (last) {
      if (totalOrders > 0 || customer.name || customer.address) {
        last.innerHTML = `
          <div><span>Tên gần nhất</span><strong>${escapeHtml(customer.name || summary.last_customer_name || 'Chưa có')}</strong></div>
          <div><span>Địa chỉ gần nhất</span><strong>${escapeHtml(customer.address || summary.last_address || 'Chưa có')}</strong></div>
          <div><span>Lần mua gần nhất</span><strong>${escapeHtml(dateText(summary.last_order_at))}</strong></div>
          <div><span>CN/Nguồn gần nhất</span><strong>${escapeHtml([summary.last_branch_name, summary.last_source_name].filter(Boolean).join(' · ') || 'Chưa có')}</strong></div>
        `;
      } else {
        last.innerHTML = '<p class="empty small">SĐT này chưa có đơn cũ. Có thể là khách mới.</p>';
      }
    }

    if (orders) {
      orders.innerHTML = recentOrders.length
        ? `<strong class="customer-orders-title">Đơn gần đây</strong>${recentOrders.map((order) => `
            <a class="customer-order-row" href="/orders/${Number(order.id)}" target="_blank" rel="noopener">
              <span>
                <b>${escapeHtml(order.order_code)}</b>
                <small>${escapeHtml(dateText(order.created_at))} · ${escapeHtml(orderTypeLabel(order.order_type))} · ${escapeHtml(order.branch_name || 'Chưa CN')}</small>
              </span>
              <em class="status-${escapeHtml(order.workflow_status)}">${escapeHtml(statusLabel(order.workflow_status))}</em>
              <strong>${money(order.total || 0)}</strong>
            </a>
          `).join('')}`
        : '';
    }

    if (fillButton) {
      fillButton.hidden = !(customer.name || summary.last_customer_name || customer.address || summary.last_address);
    }
    if (addButton) addButton.hidden = isBlacklisted;
    if (removeButton) removeButton.hidden = !isBlacklisted;
    if (reasonInput) {
      reasonInput.value = isBlacklisted ? (customer.blacklist_reason || '') : '';
      reasonInput.placeholder = isBlacklisted ? 'Lý do blacklist' : 'Lý do blacklist, ví dụ: boom hàng nhiều lần';
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
          if (status) status.textContent = 'Lỗi tra cứu';
          if (title) title.textContent = error.message || 'Không tra cứu được khách hàng';
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

  phoneInput.addEventListener('input', scheduleLookup);
  phoneInput.addEventListener('change', scheduleLookup);

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
    try {
      await setBlacklist(true);
    } catch (error) {
      alert(error.message || 'Không thêm được blacklist');
    }
  });

  removeButton?.addEventListener('click', async () => {
    try {
      await setBlacklist(false);
    } catch (error) {
      alert(error.message || 'Không gỡ được blacklist');
    }
  });

  if (normalizedPhone(phoneInput.value).length >= 8) {
    scheduleLookup();
  }
})();
