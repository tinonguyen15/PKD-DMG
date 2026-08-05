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
      .menu-warning-modal{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.45);backdrop-filter:blur(4px)}.menu-warning-dialog{width:min(480px,100%);background:#fff;border-radius:22px;box-shadow:0 24px 80px rgba(15,23,42,.25);padding:22px;display:grid;gap:16px;animation:menuWarningIn .18s ease-out}.menu-warning-dialog.is-warning{border-top:6px solid #f59e0b}.menu-warning-dialog.is-paused{border-top:6px solid #f97316}.menu-warning-dialog.is-danger{border-top:6px solid #ef4444}.menu-warning-head{display:flex;align-items:flex-start;gap:14px}.menu-warning-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#fff7ed,#ffedd5);color:#c2410c;font-size:24px;font-weight:900;flex:0 0 auto}.menu-warning-head h3{margin:0 0 4px;font-size:20px;line-height:1.2;color:#101828}.menu-warning-head p{margin:0;color:#667085;font-size:14px}.menu-warning-body{display:grid;gap:10px;padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #e4e7ec}.menu-warning-status{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:7px 12px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:13px;font-weight:800}.menu-warning-line{display:grid;gap:3px}.menu-warning-line span{color:#667085;font-size:12px;font-weight:700;text-transform:uppercase}.menu-warning-line strong{color:#101828;font-size:14px;line-height:1.45}.menu-warning-message{color:#344054;font-size:14px;line-height:1.5}.menu-warning-actions{display:flex;justify-content:flex-end;gap:10px}.menu-warning-actions .btn-secondary,.menu-warning-actions .btn-primary{min-width:120px;min-height:44px;border-radius:14px;font-weight:800;font-size:14px;cursor:pointer;border:1px solid transparent}.menu-warning-actions .btn-secondary{background:#fff;border-color:#d0d5dd;color:#344054}.menu-warning-actions .btn-secondary:hover{background:#f9fafb}.menu-warning-actions .btn-primary{background:#16a34a;color:#fff}.menu-warning-actions .btn-primary:hover{background:#15803d}@keyframes menuWarningIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
      @media(max-width:700px){.menu-alert-actions{grid-template-columns:1fr}.menu-alert-badge{max-width:120px}.menu-warning-dialog{padding:18px;border-radius:18px}.menu-warning-actions{flex-direction:column-reverse}.menu-warning-actions .btn-secondary,.menu-warning-actions .btn-primary{width:100%}}
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
      if (!warnBeforeAdding(card, event.target)) {
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

  function warnBeforeAdding(card, originalTarget) {
    const branchId = selectedBranchId();
    const itemId = menuItemId(card);
    const alert = branchId ? alertFor(branchId, itemId) : null;
    if (!alert) return true;

    const key = `${branchId}:${itemId}`;
    if (ignoredWarnings.has(key)) return true;

    const itemName = $('.dish-info strong', card)?.textContent?.trim() || alert.item_name || 'Món này';
    const branchName = $('[name="branch_id"] option:checked', form)?.textContent?.trim() || alert.branch_name || 'chi nhánh này';

    openWarningModal({
      itemName,
      branchName,
      alertLabel: alert.label || 'Đang cảnh báo',
      note: alert.note || '',
      updatedBy: alert.updated_by_name || '',
      level: alert.level || 'paused',
      onConfirm: () => {
        ignoredWarnings.add(key);
        continueAddAfterWarning(card, originalTarget);
      }
    });

    return false;
  }

  function continueAddAfterWarning(card, originalTarget) {
    const plusButton = card.querySelector('[data-qty-step="1"]');
    if (!plusButton) return;

    if (originalTarget?.closest?.('[data-qty-step="1"]')) {
      plusButton.click();
      return;
    }

    plusButton.click();
  }

  function openWarningModal({ itemName, branchName, alertLabel, note, updatedBy, level, onConfirm }) {
    const existing = document.querySelector('[data-warning-modal]');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'menu-warning-modal';
    modal.dataset.warningModal = '1';

    const levelClass = level === 'out'
      ? 'is-danger'
      : (level === 'soon' ? 'is-warning' : 'is-paused');

    modal.innerHTML = `
      <div class="menu-warning-dialog ${levelClass}" role="dialog" aria-modal="true" aria-labelledby="menu-warning-title">
        <div class="menu-warning-head">
          <div class="menu-warning-icon">!</div>
          <div>
            <h3 id="menu-warning-title">Cảnh báo món tại chi nhánh</h3>
            <p>${escapeHtml(itemName)} · ${escapeHtml(branchName)}</p>
          </div>
        </div>

        <div class="menu-warning-body">
          <div class="menu-warning-status">${escapeHtml(alertLabel)}</div>
          ${note ? `<div class="menu-warning-line"><span>Ghi chú</span><strong>${escapeHtml(note)}</strong></div>` : ''}
          ${updatedBy ? `<div class="menu-warning-line"><span>Cập nhật bởi</span><strong>${escapeHtml(updatedBy)}</strong></div>` : ''}
        </div>

        <div class="menu-warning-message">
          Món này đang có cảnh báo. Bạn vẫn muốn tiếp tục chọn món?
        </div>

        <div class="menu-warning-actions">
          <button type="button" class="btn-secondary" data-warning-cancel>Hủy</button>
          <button type="button" class="btn-primary" data-warning-confirm>Vẫn chọn món</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      modal.remove();
    };

    const escHandler = (event) => {
      if (event.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-warning-cancel]')) {
        close();
        document.removeEventListener('keydown', escHandler);
        return;
      }

      if (event.target.closest('[data-warning-confirm]')) {
        close();
        document.removeEventListener('keydown', escHandler);
        if (typeof onConfirm === 'function') onConfirm();
      }
    });
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
