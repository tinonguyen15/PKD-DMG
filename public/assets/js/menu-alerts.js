(function () {
  const form = document.querySelector('[data-order-create]');
  if (!form || form.dataset.menuAlertsReady === '1') return;
  form.dataset.menuAlertsReady = '1';

  const endpoint = '/menu-alerts.php';
  const csrf = () => form.querySelector("input[name='_csrf']")?.value || document.querySelector("input[name='_csrf']")?.value || '';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const ignoredWarnings = new Set();
  let alerts = [];

  injectStyles();
  initCards();
  bindEvents();
  loadAlerts();
  setInterval(loadAlerts, 60000);

  function injectStyles() {
    if (document.querySelector('[data-menu-alert-style]')) return;
    const style = document.createElement('style');
    style.dataset.menuAlertStyle = '1';
    style.textContent = `
      .menu-card{position:relative;overflow:visible}.menu-card[data-alert-level="normal"]{box-shadow:inset 0 0 0 1px rgba(18,183,106,.22)}
      .menu-card[data-alert-level="soon"]{background:#fffaeb!important;box-shadow:inset 0 0 0 2px #fdb022}.menu-card[data-alert-level="paused"]{background:#fff4e5!important;box-shadow:inset 0 0 0 2px #fb8500}.menu-card[data-alert-level="out"]{background:#fef3f2!important;box-shadow:inset 0 0 0 2px #f04438}
      .menu-alert-tools{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:7px}.menu-alert-badge{display:inline-flex;align-items:center;max-width:150px;min-height:24px;padding:3px 8px;border-radius:999px;background:#ecfdf3;color:#027a48;font-size:11px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.menu-alert-badge.soon{background:#fffaeb;color:#b54708}.menu-alert-badge.paused{background:#fff4e5;color:#c25b00}.menu-alert-badge.out{background:#fef3f2;color:#b42318}.menu-alert-btn{min-height:26px;padding:4px 8px;border:1px solid #d0d5dd;border-radius:999px;background:#fff;color:#344054;font-size:11px;font-weight:900;cursor:pointer}.menu-alert-btn:hover{border-color:#0f6b48;color:#0f6b48;background:#f5fff8}
      .menu-alert-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(16,24,40,.42);padding:16px}.menu-alert-dialog{width:min(430px,100%);border-radius:18px;background:#fff;box-shadow:0 22px 70px rgba(16,24,40,.28);padding:16px;display:grid;gap:12px}.menu-alert-dialog h3{margin:0;color:#101828}.menu-alert-dialog p{margin:0;color:#475467;font-size:13px}.menu-alert-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.menu-alert-actions button,.menu-alert-footer button{min-height:38px;border:1px solid #d0d5dd;border-radius:12px;background:#fff;font-weight:900;cursor:pointer}.menu-alert-actions button[data-alert-action="paused-10"]{background:#fffaeb;color:#b54708}.menu-alert-actions button[data-alert-action="paused-30"]{background:#fff4e5;color:#c25b00}.menu-alert-actions button[data-alert-action="out"]{background:#fef3f2;color:#b42318}.menu-alert-actions button[data-alert-action="clear"]{background:#ecfdf3;color:#027a48}.menu-alert-dialog textarea{width:100%;min-height:70px;border:1px solid #d0d5dd;border-radius:12px;padding:10px;font:inherit;resize:vertical}.menu-alert-footer{display:flex;justify-content:flex-end;gap:8px}.menu-alert-toast{position:fixed;left:50%;bottom:20px;z-index:10000;transform:translateX(-50%);padding:10px 14px;border-radius:999px;background:#101828;color:#fff;font-weight:900;font-size:13px;box-shadow:0 12px 30px rgba(16,24,40,.26)}
      @media(max-width:700px){.menu-alert-actions{grid-template-columns:1fr}.menu-alert-badge{max-width:120px}}
    `;
    document.head.appendChild(style);
  }

  function initCards() {
    $$('[data-menu-card]', form).forEach((card) => {
      const itemId = menuItemId(card);
      if (!itemId || card.querySelector('[data-menu-alert-tools]')) return;
      card.dataset.menuItemId = String(itemId);
      const host = $('.dish-info', card) || card;
      const tools = document.createElement('div');
      tools.className = 'menu-alert-tools';
      tools.dataset.menuAlertTools = '1';
      tools.innerHTML = '<span class="menu-alert-badge" data-menu-alert-badge>Order bình thường</span><button class="menu-alert-btn" type="button" data-menu-alert-open>Cảnh báo</button>';
      host.appendChild(tools);
    });
  }

  function bindEvents() {
    const branch = $('[name="branch_id"]', form);
    branch?.addEventListener('change', renderCards);

    form.addEventListener('click', (event) => {
      const open = event.target.closest('[data-menu-alert-open]');
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        const card = open.closest('[data-menu-card]');
        openEditor(card);
        return;
      }
    }, true);

    form.addEventListener('click', (event) => {
      const card = event.target.closest('[data-menu-card]');
      if (!card || event.target.closest('[data-menu-alert-tools]') || event.target.closest('[data-item-note-row]') || event.target.closest('.qty-input')) return;
      const step = event.target.closest('[data-qty-step]');
      if (step && Number(step.dataset.qtyStep || 0) <= 0) return;
      if (!warnBeforeAdding(card)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  async function loadAlerts() {
    try {
      const response = await fetch(endpoint, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      const payload = await response.json();
      alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
      renderCards();
    } catch (error) {
      // Không chặn order nếu phần cảnh báo đang lỗi mạng.
    }
  }

  function renderCards() {
    const branchId = selectedBranchId();
    $$('[data-menu-card]', form).forEach((card) => {
      const itemId = menuItemId(card);
      const alert = branchId ? alertFor(branchId, itemId) : null;
      const badge = $('[data-menu-alert-badge]', card);
      card.dataset.alertLevel = branchId ? (alert?.level || 'normal') : '';
      card.dataset.alertLabel = alert?.label || '';
      card.dataset.alertNote = alert?.note || '';
      if (badge) {
        badge.className = 'menu-alert-badge ' + (alert?.level || '');
        badge.textContent = branchId ? (alert?.label || 'Order bình thường') : 'Chọn CN để xem';
        badge.title = alert?.note || badge.textContent;
      }
    });
  }

  function warnBeforeAdding(card) {
    const branchId = selectedBranchId();
    const itemId = menuItemId(card);
    const alert = branchId ? alertFor(branchId, itemId) : null;
    if (!alert) return true;

    const key = `${branchId}:${itemId}`;
    if (ignoredWarnings.has(key)) return true;

    const itemName = $('.dish-info strong', card)?.textContent?.trim() || alert.item_name || 'Món này';
    const branchName = $('[name="branch_id"] option:checked', form)?.textContent?.trim() || alert.branch_name || 'chi nhánh này';
    const note = alert.note ? `\nGhi chú: ${alert.note}` : '';
    const who = alert.updated_by_name ? `\nNgười cập nhật: ${alert.updated_by_name}` : '';
    const ok = window.confirm(`${itemName} tại ${branchName} đang cảnh báo: ${alert.label}.${note}${who}\n\nVẫn muốn chọn món này?`);
    if (ok) ignoredWarnings.add(key);
    return ok;
  }

  function openEditor(card) {
    const branchId = selectedBranchId();
    const itemId = menuItemId(card);
    if (!branchId) {
      toast('Chọn chi nhánh trước rồi mới bật cảnh báo món.');
      $('[name="branch_id"]', form)?.focus();
      return;
    }
    if (!itemId) return;

    const current = alertFor(branchId, itemId);
    const itemName = $('.dish-info strong', card)?.textContent?.trim() || current?.item_name || 'Món';
    const modal = document.createElement('div');
    modal.className = 'menu-alert-modal';
    modal.innerHTML = `
      <div class="menu-alert-dialog" role="dialog" aria-modal="true">
        <h3>Cảnh báo món</h3>
        <p><b>${escapeHtml(itemName)}</b><br>Trạng thái hiện tại: ${escapeHtml(current?.label || 'Order bình thường')}</p>
        <textarea data-alert-note placeholder="Ghi chú ngắn, ví dụ: CN báo còn ít / bếp báo hết tạm...">${escapeHtml(current?.note || '')}</textarea>
        <div class="menu-alert-actions">
          <button type="button" data-alert-action="paused-10">Tạm hết 10p</button>
          <button type="button" data-alert-action="paused-30">Tạm hết 30p</button>
          <button type="button" data-alert-action="out">Hết món</button>
          <button type="button" data-alert-action="clear">Bỏ cảnh báo</button>
        </div>
        <div class="menu-alert-footer"><button type="button" data-alert-close>Đóng</button></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', async (event) => {
      if (event.target === modal || event.target.closest('[data-alert-close]')) {
        modal.remove();
        return;
      }
      const action = event.target.closest('[data-alert-action]')?.dataset.alertAction;
      if (!action) return;
      event.preventDefault();
      const note = $('[data-alert-note]', modal)?.value || '';
      await saveAlert(branchId, itemId, action, note);
      modal.remove();
    });
  }

  async function saveAlert(branchId, itemId, action, note) {
    const formData = new FormData();
    formData.append('_csrf', csrf());
    formData.append('branch_id', String(branchId));
    formData.append('menu_item_id', String(itemId));
    formData.append('note', note || '');

    if (action === 'paused-10') {
      formData.append('status', 'paused');
      formData.append('minutes', '10');
    } else if (action === 'paused-30') {
      formData.append('status', 'paused');
      formData.append('minutes', '30');
    } else if (action === 'out') {
      formData.append('status', 'out');
      formData.append('minutes', '0');
    } else {
      formData.append('status', 'clear');
      formData.append('minutes', '0');
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      });
      const payload = await response.json();
      if (!response.ok || payload.ok === false) throw new Error(payload.message || 'Không cập nhật được cảnh báo');
      alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
      renderCards();
      toast(payload.message || 'Đã cập nhật cảnh báo món.');
    } catch (error) {
      toast(error.message || 'Không cập nhật được cảnh báo món.');
    }
  }

  function selectedBranchId() {
    return Number($('[name="branch_id"]', form)?.value || 0);
  }

  function menuItemId(card) {
    const value = card?.dataset.menuItemId;
    if (value) return Number(value);
    const input = card?.querySelector('.qty-input[name^="items["]');
    const match = input?.name?.match(/^items\[(\d+)\]$/);
    return match ? Number(match[1]) : 0;
  }

  function alertFor(branchId, itemId) {
    return alerts.find((alert) => Number(alert.branch_id) === Number(branchId) && Number(alert.menu_item_id) === Number(itemId)) || null;
  }

  function toast(message) {
    const node = document.createElement('div');
    node.className = 'menu-alert-toast';
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }
})();
