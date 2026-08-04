(function () {
  const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const defaultOrderPreferences = {
    copy_branch_notice_bank_transfer_enabled: false,
    copy_branch_notice_default_enabled: false,
    copy_branch_notice_cod_enabled: false,
    copy_branch_notice_scheduled_enabled: false,
    copy_branch_tag_text: "",
    copy_branch_tag_by_branch: {},
    copy_branch_notice_bank_transfer: "⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé.",
    copy_branch_notice_default: "⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé.",
    copy_branch_notice_cod: "⚠ Lưu ý: Đơn ship COD nhé",
    copy_branch_notice_scheduled: "⚠ Lưu ý: Đơn hẹn giờ giao nhé",
    copy_branch_quick_notice_paid_ck: "⚠ Lưu ý: Khách đã CK nhé",
    copy_branch_quick_notice_call_before_delivery: "⚠ Lưu ý: Gọi khách trước khi giao nhé",
    copy_branch_quick_notice_urgent: "⚠ Lưu ý: Khách lấy gấp nhé",
    copy_branch_quick_notice_invoice: "⚠ Lưu ý: Khách cần hóa đơn nhé",
    auto_mark_sent_on_branch_copy: false,
    customer_confirmation_intro: "",
    customer_confirmation_footer: "",
    show_recent_menu_items_first: true,
    favorite_menu_item_ids: []
  };
  const quickNoticeSettingKeys = {
    paid_ck: "copy_branch_quick_notice_paid_ck",
    call_before_delivery: "copy_branch_quick_notice_call_before_delivery",
    urgent: "copy_branch_quick_notice_urgent",
    invoice: "copy_branch_quick_notice_invoice"
  };
  const orderPreferences = (() => {
    const node = $("[data-order-preferences]");
    if (!node) return defaultOrderPreferences;
    try {
      return { ...defaultOrderPreferences, ...JSON.parse(node.textContent || "{}") };
    } catch (error) {
      return defaultOrderPreferences;
    }
  })();
  const initialOrderDrafts = (() => {
    const node = $("[data-order-drafts]");
    if (!node) return [];
    try {
      const drafts = JSON.parse(node.textContent || "[]");
      return Array.isArray(drafts) ? drafts : [];
    } catch (error) {
      return [];
    }
  })();

  function toast(message) {
    const root = $("#toast-root");
    if (!root) return;
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    root.appendChild(node);
    setTimeout(() => node.remove(), 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Đã copy");
      return true;
    } catch (error) {
      toast("Không copy được, hãy chọn và copy thủ công");
      return false;
    }
  }

  function orderTitle(type) {
    if (type === "pickup") return "ĐƠN GHÉ LẤY";
    return "ĐƠN MANG VỀ";
  }

  function timeLabel(type) {
    if (type === "pickup") return "Thời gian ghé lấy";
    if (type === "booking") return "Thời gian";
    return "Thời gian nhận";
  }

  function selectedText(select) {
    if (!select || select.selectedIndex < 0) return "";
    return select.options[select.selectedIndex].textContent.trim();
  }

  function selectedValue(form, name) {
    return form.querySelector(`[name="${name}"]:checked`)?.value || form.querySelector(`[name="${name}"]`)?.value || "";
  }

  function collectOrder(form) {
    const type = selectedValue(form, "order_type") || "delivery";
    const branch = selectedText($("[name='branch_id']", form)) || "Chưa chọn";
    const branchId = parseInt($("[name='branch_id']", form)?.value || "0", 10);
    const payment = selectedText($("[name='payment_method_id']", form)) || "...";
    const customerName = $("[name='customer_name']", form)?.value.trim() || "...";
    const phone = $("[name='phone']", form)?.value.trim() || "...";
    const address = $("[name='address']", form)?.value.trim() || "...";
    const receiveTime = $("[name='receive_time']", form)?.value.trim() || (type === "delivery" ? "Giao ngay" : "...");
    const guestCount = $("[name='guest_count']", form)?.value.trim() || "";
    const bookingNote = $("[name='note']", form)?.value.trim() || "";
    const quickNotices = $$("[name='quick_notices[]']:checked", form).map((input) => input.value);
    const lines = [];
    let total = 0;

    $$("[data-menu-card]", form).forEach((card) => {
      const quantity = Math.max(0, parseInt($(".qty-input", card).value || "0", 10));
      if (!quantity) return;
      const price = parseInt(card.dataset.price || "0", 10);
      total += quantity * price;
      lines.push({
        quantity,
        price,
        branchName: card.dataset.branchName || "",
        customerName: card.dataset.customerName || "",
        note: $("[data-item-note-row] input", card)?.value.trim() || ""
      });
    });

    return { type, branch, branchId, payment, customerName, phone, address, receiveTime, guestCount, bookingNote, quickNotices, lines, total };
  }

  function renderBranchText(order) {
    if (order.type === "booking") {
      const lines = [
        "KHÁCH ĐẶT BÀN :",
        `• Tên khách: ${order.customerName}`,
        `• SĐT: ${order.phone}`,
        `• Số lượng: ${order.guestCount ? `${order.guestCount} khách` : "Chưa nhập"}`,
        `• Thời gian: ${order.receiveTime}`,
        `• Chi nhánh: ${order.branch}`,
        `• Ghi chú: ${order.bookingNote || "Không có"}`
      ];
      appendBranchFooter(lines, order);
      return lines.join("\n");
    }

    const lines = [
      orderTitle(order.type),
      "",
      `• Chi nhánh: ${order.branch}`,
      `• Tên: ${order.customerName}`,
      `• SĐT: ${order.phone}`
    ];
    if (order.type === "delivery") lines.push(`• Địa chỉ: ${order.address}`);
    if (order.lines.length) {
      order.lines.forEach((item, index) => {
        const prefix = index === 0 ? "• Món: " : "";
        const price = item.price ? ` ${Math.round(item.price / 1000)}k` : "";
        lines.push(`${prefix}${item.quantity} ${item.branchName}${price}${item.note ? ` - ${item.note}` : ""}`);
      });
    } else {
      lines.push("• Món: Chưa chọn món");
    }
    lines.push(`• ${timeLabel(order.type)}: ${order.receiveTime}`);
    lines.push(`• Thanh toán: ${order.payment}`);
    appendBranchFooter(lines, order);
    return lines.join("\n");
  }

  function renderCustomerText(order) {
    if (order.type === "booking") {
      const lines = [
        "XÁC NHẬN ĐẶT BÀN",
        ""
      ];
      appendCustomerIntro(lines);
      lines.push(
        `• Tên khách: ${order.customerName}`,
        `• SĐT: ${order.phone}`,
        `• Số lượng: ${order.guestCount ? `${order.guestCount} khách` : "Chưa nhập"}`,
        `• Thời gian: ${order.receiveTime}`,
        `• Chi nhánh: ${order.branch}`,
        `• Ghi chú: ${order.bookingNote || "Không có"}`
      );
      appendCustomerFooter(lines);
      return lines.join("\n");
    }

    const lines = [
      `XÁC NHẬN ${orderTitle(order.type)}`,
      ""
    ];
    appendCustomerIntro(lines);
    lines.push(
      `• Chi nhánh: ${order.branch}`,
      `• Tên: ${order.customerName}`,
      `• SĐT: ${order.phone}`
    );
    if (order.type === "delivery") lines.push(`• Địa chỉ: ${order.address}`);
    if (order.lines.length) {
      order.lines.forEach((item, index) => {
        const prefix = index === 0 ? "• Món: " : "";
        lines.push(`${prefix}${item.quantity} ${item.customerName}${item.note ? ` - ${item.note}` : ""}`);
      });
    } else {
      lines.push("• Món: ...");
    }
    lines.push(`== Tổng tiền món: ${money(order.total)} ==`);
    lines.push(`• ${timeLabel(order.type)}: ${order.receiveTime}`);
    lines.push(`• Hình thức thanh toán: ${order.payment}`);
    appendCustomerFooter(lines);
    return lines.join("\n");
  }

  function appendBranchFooter(lines, order) {
    const footer = [];

    const payment = String(order.payment || "").trim().toLowerCase();
    if (payment === "chuyển khoản") {
      pushFooterLine(footer, "copy_branch_notice_bank_transfer_enabled", "copy_branch_notice_bank_transfer");
    } else {
      pushFooterLine(footer, "copy_branch_notice_default_enabled", "copy_branch_notice_default");
    }
    if (payment.includes("cod")) {
      pushFooterLine(footer, "copy_branch_notice_cod_enabled", "copy_branch_notice_cod");
    }
    if (isScheduledDelivery(order)) {
      pushFooterLine(footer, "copy_branch_notice_scheduled_enabled", "copy_branch_notice_scheduled");
    }
    (order.quickNotices || []).forEach((key) => {
      const settingKey = quickNoticeSettingKeys[key];
      if (settingKey) pushFooterLineByText(footer, orderPreferences[settingKey]);
    });

    const tagText = branchTagText(order);
    if (tagText) {
      footer.push(tagText);
    }

    if (footer.length) {
      lines.push("");
      lines.push(...footer);
    }
  }

  function pushFooterLine(footer, enabledKey, textKey) {
    if (!orderPreferences[enabledKey]) return;
    const line = String(orderPreferences[textKey] || "").trim();
    if (line && !footer.includes(line)) footer.push(line);
  }

  function pushFooterLineByText(footer, line) {
    const text = String(line || "").trim();
    if (text && !footer.includes(text)) footer.push(text);
  }

  function appendCustomerIntro(lines) {
    const intro = String(orderPreferences.customer_confirmation_intro || "").trim();
    if (!intro) return;
    lines.push(intro, "");
  }

  function appendCustomerFooter(lines) {
    const footer = String(orderPreferences.customer_confirmation_footer || "").trim();
    if (!footer) return;
    lines.push("", footer);
  }

  function branchTagText(order) {
    const branchTags = orderPreferences.copy_branch_tag_by_branch || {};
    const branchTag = String(branchTags[String(order.branchId)] || "").trim();
    if (branchTag) return branchTag;
    return String(orderPreferences.copy_branch_tag_text || "").trim();
  }

  function isScheduledDelivery(order) {
    if (order.type !== "delivery") return false;
    const time = String(order.receiveTime || "").trim().toLowerCase();
    if (!time || time === "giao ngay") return false;
    return !time.includes("ngay");
  }

  function updateOrderForm(form) {
    const selectedType = selectedValue(form, "order_type") || "delivery";
    syncTypeFields(form, selectedType);
    const order = collectOrder(form);
    const preview = $("[data-order-preview]", form);
    const total = $("[data-order-total]", form);
    const cart = $("[data-cart-lines]", form);
    const address = $("[data-address-field]", form);
    const time = $("[data-time-label]", form);

    if (preview) preview.value = renderBranchText(order);
    if (total) total.textContent = money(order.total);
    if (time) {
      time.childNodes[0].nodeValue = `${timeLabel(order.type)} `;
      const input = $("input", time);
      if (input) input.placeholder = order.type === "delivery" ? "Giao ngay" : (order.type === "booking" ? "Ví dụ: 11h hôm nay" : "Ví dụ: 15p nữa");
    }
    if (cart) {
      cart.innerHTML = order.type === "booking"
        ? `<div class="cart-line"><span>${escapeHtml(order.guestCount || "0")} khách</span><b>Đặt bàn</b></div>`
        : order.lines.length
        ? order.lines.map((item) => `<div class="cart-line"><span>${item.quantity} ${escapeHtml(item.branchName)}${item.note ? ` - ${escapeHtml(item.note)}` : ""}</span><b>${money(item.quantity * item.price)}</b></div>`).join("")
        : '<p class="empty small">Chưa chọn món.</p>';
    }
  }

  function syncTypeFields(form, type) {
    const address = $("[data-address-field]", form);
    const paymentField = $("[data-payment-field]", form);
    const paymentSelect = $("[name='payment_method_id']", form);
    const menuPanel = $("[data-menu-panel]", form);
    const bookingFields = $$("[data-booking-field], [data-booking-note-field]", form);

    if (address) {
      address.hidden = type !== "delivery";
      $$("input, select, textarea", address).forEach((input) => input.disabled = type !== "delivery");
    }

    bookingFields.forEach((field) => {
      field.hidden = type !== "booking";
      $$("input, select, textarea", field).forEach((input) => input.disabled = type !== "booking");
    });

    if (paymentField && paymentSelect) {
      paymentField.hidden = type === "booking";
      paymentSelect.disabled = type === "booking";
      paymentSelect.required = type !== "booking";
      let selectedStillValid = false;
      Array.from(paymentSelect.options).forEach((option) => {
        const allowed = (option.dataset.allowedTypes || "").split(/\s+/).filter(Boolean);
        const visible = allowed.includes(type);
        option.hidden = !visible;
        option.disabled = !visible;
        if (option.selected && visible) selectedStillValid = true;
      });
      if (type !== "booking" && !selectedStillValid) {
        const next = Array.from(paymentSelect.options).find((option) => !option.disabled);
        if (next) next.selected = true;
      }
    }

    if (menuPanel) {
      menuPanel.hidden = type === "booking";
      $$("input", menuPanel).forEach((input) => input.disabled = type === "booking");
    }

    $$("[data-menu-card]", form).forEach((card) => {
      const quantity = Math.max(0, parseInt($(".qty-input", card)?.value || "0", 10));
      const noteRow = $("[data-item-note-row]", card);
      if (!noteRow) return;
      noteRow.hidden = quantity < 1 || type === "booking";
      const noteInput = $("input", noteRow);
      if (noteInput) noteInput.disabled = quantity < 1 || type === "booking";
    });
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function csrfToken(form) {
    return $("[name='_csrf']", form)?.value || document.querySelector("[name='_csrf']")?.value || "";
  }

  function intValue(value) {
    return Math.max(0, parseInt(value || "0", 10) || 0);
  }

  function collectDraftPayload(form) {
    const type = selectedValue(form, "order_type") || "delivery";
    const items = {};
    const itemNotes = {};

    if (type !== "booking") {
      $$("[name^='items[']", form).forEach((input) => {
        const match = input.name.match(/^items\[(\d+)\]$/);
        const quantity = intValue(input.value);
        if (match && quantity > 0) {
          items[match[1]] = quantity;
        }
      });
      $$("[name^='item_notes[']", form).forEach((input) => {
        const match = input.name.match(/^item_notes\[(\d+)\]$/);
        const value = input.value.trim();
        if (match && value) {
          itemNotes[match[1]] = value;
        }
      });
    }

    return {
      order_type: type,
      source_id: intValue($("[name='source_id']:checked", form)?.value),
      customer_name: $("[name='customer_name']", form)?.value.trim() || "",
      phone: $("[name='phone']", form)?.value.trim() || "",
      branch_id: intValue($("[name='branch_id']", form)?.value),
      address: type === "delivery" ? ($("[name='address']", form)?.value.trim() || "") : "",
      receive_time: $("[name='receive_time']", form)?.value.trim() || "",
      payment_method_id: type === "booking" ? 0 : intValue($("[name='payment_method_id']", form)?.value),
      guest_count: type === "booking" ? intValue($("[name='guest_count']", form)?.value) : 0,
      note: type === "booking" ? ($("[name='note']", form)?.value.trim() || "") : "",
      quick_notices: $$("[name='quick_notices[]']:checked", form).map((input) => input.value),
      items,
      item_notes: itemNotes
    };
  }

  function draftHasContent(payload) {
    return Boolean(
      payload.customer_name
      || payload.phone
      || payload.address
      || payload.receive_time
      || payload.guest_count
      || payload.note
      || (payload.quick_notices || []).length
      || Object.keys(payload.items || {}).length
    );
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeDraftKey() {
    return `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function draftKey(draft) {
    if (draft?.client_key) return draft.client_key;
    if (draft?.id) return `server-${draft.id}`;
    return makeDraftKey();
  }

  function normalizePayload(payload = {}) {
    const objectFromEntries = (value) => Object.fromEntries(Object.entries(value || {}).filter(([, itemValue]) => itemValue !== "" && itemValue !== null && typeof itemValue !== "undefined"));
    return {
      order_type: ["delivery", "pickup", "booking"].includes(payload.order_type) ? payload.order_type : "delivery",
      source_id: intValue(payload.source_id),
      customer_name: String(payload.customer_name || "").trim(),
      phone: String(payload.phone || "").trim(),
      branch_id: intValue(payload.branch_id),
      address: String(payload.address || "").trim(),
      receive_time: String(payload.receive_time || "").trim(),
      payment_method_id: intValue(payload.payment_method_id),
      guest_count: intValue(payload.guest_count),
      note: String(payload.note || "").trim(),
      quick_notices: Array.isArray(payload.quick_notices) ? payload.quick_notices : [],
      items: objectFromEntries(payload.items),
      item_notes: objectFromEntries(payload.item_notes)
    };
  }

  function normalizeDraft(draft = {}) {
    const payload = normalizePayload(draft.payload || {});
    const key = draftKey(draft);
    return {
      id: intValue(draft.id),
      client_key: key,
      order_type: draft.order_type || payload.order_type,
      customer_name: draft.customer_name || payload.customer_name || "Chưa nhập tên",
      phone: draft.phone || payload.phone || "",
      item_count: intValue(draft.item_count),
      total: intValue(draft.total),
      payload,
      created_at: draft.created_at || nowIso(),
      updated_at: draft.updated_at || nowIso(),
      sync_status: draft.sync_status || (draft.id ? "saved" : "local")
    };
  }

  function loadLocalDraftState(form) {
    if (!form.dataset.draftStorageKey) return { drafts: [], activeKey: "" };
    try {
      const parsed = JSON.parse(localStorage.getItem(form.dataset.draftStorageKey) || "{}");
      return {
        drafts: Array.isArray(parsed.drafts) ? parsed.drafts.map(normalizeDraft) : [],
        activeKey: String(parsed.activeKey || "")
      };
    } catch (error) {
      return { drafts: [], activeKey: "" };
    }
  }

  function persistLocalDraftState(form, state) {
    if (!form.dataset.draftStorageKey) return;
    try {
      localStorage.setItem(form.dataset.draftStorageKey, JSON.stringify({
        activeKey: state.activeKey || "",
        drafts: state.drafts.slice(0, 30)
      }));
    } catch (error) {
      // Local storage can be unavailable in private browsing; server sync still runs.
    }
  }

  function mergeDraftLists(serverDrafts, localDrafts) {
    const server = (serverDrafts || []).map(normalizeDraft);
    const local = (localDrafts || []).map(normalizeDraft);
    const serverIds = new Set(server.map((draft) => draft.id).filter(Boolean));
    const byKey = new Map();

    server.forEach((draft) => byKey.set(draft.client_key, draft));
    local.forEach((draft) => {
      if (draft.id && !serverIds.has(draft.id)) return;
      const key = draft.id ? `server-${draft.id}` : draft.client_key;
      const existing = byKey.get(key);
      if (!existing || String(draft.updated_at || "") > String(existing.updated_at || "")) {
        byKey.set(key, { ...draft, client_key: key });
      }
    });

    return Array.from(byKey.values())
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
      .slice(0, 30);
  }

  function menuItemPrice(form, id) {
    const input = form.querySelector(`[name="items[${CSS.escape(String(id))}]"]`);
    const card = input?.closest("[data-menu-card]");
    return intValue(card?.dataset.price);
  }

  function summarizePayload(form, payload) {
    const itemEntries = Object.entries(payload.items || {});
    const itemCount = itemEntries.reduce((sum, [, quantity]) => sum + intValue(quantity), 0);
    const total = itemEntries.reduce((sum, [id, quantity]) => sum + (menuItemPrice(form, id) * intValue(quantity)), 0);
    return { itemCount, total };
  }

  function currentDraftFromForm(form, state) {
    const payload = collectDraftPayload(form);
    const summary = summarizePayload(form, payload);
    const existing = state.drafts.find((draft) => draft.client_key === state.activeKey);
    const key = existing?.client_key || state.activeKey || makeDraftKey();
    const now = nowIso();
    return {
      id: existing?.id || intValue($("[data-draft-id]", form)?.value),
      client_key: key,
      order_type: payload.order_type,
      customer_name: payload.customer_name || "Chưa nhập tên",
      phone: payload.phone,
      item_count: summary.itemCount,
      total: summary.total,
      payload,
      created_at: existing?.created_at || now,
      updated_at: now,
      sync_status: existing?.sync_status === "saving" ? "saving" : "local"
    };
  }

  function getActiveDraft(state) {
    return state.drafts.find((draft) => draft.client_key === state.activeKey) || null;
  }

  function upsertLocalDraft(form, state, { force = false } = {}) {
    const draft = currentDraftFromForm(form, state);
    if (!force && !draft.id && !draftHasContent(draft.payload)) return null;

    state.activeKey = draft.client_key;
    state.drafts = [draft, ...state.drafts.filter((item) => item.client_key !== draft.client_key)]
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
      .slice(0, 30);
    const input = $("[data-draft-id]", form);
    if (input) input.value = draft.id ? String(draft.id) : "0";
    persistLocalDraftState(form, state);
    return draft;
  }

  function formatDraftCode(draft) {
    if (!draft) return "Nháp mới";
    if (draft.id) return `Nháp #${draft.id}`;
    return "Nháp tạm";
  }

  function draftSummary(draft) {
    const name = draft.customer_name || draft.payload?.customer_name || "Chưa nhập tên";
    const count = Number(draft.item_count || 0);
    const total = Number(draft.total || 0);
    return `${name} | ${count} món | ${money(total)}`;
  }

  function syncText(draft) {
    if (!draft) return "Đã sẵn sàng.";
    if (draft.sync_status === "saving") return "Đang lưu nháp...";
    if (draft.sync_status === "error") return "Chưa đồng bộ, vẫn đã lưu trên máy.";
    if (draft.id) return "Đã lưu nháp.";
    return "Đã lưu trên máy, đang chờ đồng bộ.";
  }

  function renderDraftPanel(form, state) {
    const list = $("[data-draft-list]", form);
    const activeCode = $("[data-active-draft-code]", form);
    const activeInfo = $("[data-active-draft-info]", form);
    const syncStatus = $("[data-draft-sync-status]", form);
    const activeDraft = getActiveDraft(state);
    const current = collectOrder(form);
    const totalItems = current.lines.reduce((sum, item) => sum + item.quantity, 0);

    if (activeCode) activeCode.textContent = formatDraftCode(activeDraft);
    if (activeInfo) {
      activeInfo.textContent = `${current.customerName === "..." ? "Chưa nhập tên" : current.customerName} | ${totalItems} món | ${money(current.total)}`;
    }
    if (syncStatus) {
      syncStatus.textContent = syncText(activeDraft);
      syncStatus.dataset.syncStatus = activeDraft?.sync_status || "ready";
    }

    if (!list) return;
    const otherDrafts = state.drafts.filter((draft) => draft.client_key !== state.activeKey);
    if (!otherDrafts.length) {
      list.innerHTML = '<p class="empty small">Không có đơn nháp khác.</p>';
      return;
    }

    list.innerHTML = otherDrafts.map((draft) => `
      <div class="draft-chip ${draft.sync_status === "error" ? "needs-sync" : ""}">
        <button type="button" data-open-draft="${escapeHtml(draft.client_key)}">
          <strong>${escapeHtml(formatDraftCode(draft))}</strong>
          <span>${escapeHtml(draftSummary(draft))}</span>
        </button>
        <button class="icon-btn" type="button" data-delete-draft="${escapeHtml(draft.client_key)}" title="Xóa nháp">x</button>
      </div>
    `).join("");
  }

  function setRadioValue(form, name, value) {
    const target = form.querySelector(`[name="${name}"][value="${CSS.escape(String(value))}"]`);
    if (target) {
      target.checked = true;
    }
  }

  function setPaymentDefaultForType(form, type) {
    const select = $("[name='payment_method_id']", form);
    if (!select || type === "booking") return;

    const preferenceKey = type === "pickup" ? "default_pickup_payment_method_id" : "default_delivery_payment_method_id";
    const preferred = String(orderPreferences[preferenceKey] || "");
    const options = Array.from(select.options);
    const allowed = (option) => (option.dataset.allowedTypes || "").split(/\s+/).filter(Boolean).includes(type);
    const preferredOption = preferred ? options.find((option) => option.value === preferred && allowed(option)) : null;
    const fallback = options.find(allowed);
    const next = preferredOption || fallback;
    if (next) next.selected = true;
  }

  function resetFormForNewDraft(form) {
    const type = ["delivery", "pickup", "booking"].includes(orderPreferences.default_order_type)
      ? orderPreferences.default_order_type
      : "delivery";
    setRadioValue(form, "order_type", type);

    const branch = $("[name='branch_id']", form);
    if (branch) branch.value = String(orderPreferences.default_branch_id || "");

    const sourceId = String(orderPreferences.default_source_id || "");
    if (sourceId) {
      setRadioValue(form, "source_id", sourceId);
    } else {
      const firstSource = $("[name='source_id']", form);
      if (firstSource) firstSource.checked = true;
    }

    $$("[name='customer_name'], [name='phone'], [name='address'], [name='receive_time'], [name='guest_count'], [name='note']", form)
      .forEach((input) => input.value = "");
    $$("[name^='items[']", form).forEach((input) => input.value = "0");
    $$("[name^='item_notes[']", form).forEach((input) => input.value = "");
    $$("[name='quick_notices[]']", form).forEach((input) => input.checked = false);

    syncTypeFields(form, type);
    setPaymentDefaultForType(form, type);
    const draftId = $("[data-draft-id]", form);
    if (draftId) draftId.value = "0";
    updateOrderForm(form);
  }

  function applyDraftPayload(form, payload) {
    const type = ["delivery", "pickup", "booking"].includes(payload?.order_type) ? payload.order_type : "delivery";
    setRadioValue(form, "order_type", type);
    setRadioValue(form, "source_id", payload?.source_id || "");

    const branch = $("[name='branch_id']", form);
    if (branch) branch.value = String(payload?.branch_id || "");
    const payment = $("[name='payment_method_id']", form);
    if (payment) payment.value = String(payload?.payment_method_id || "");

    const values = {
      customer_name: payload?.customer_name || "",
      phone: payload?.phone || "",
      address: payload?.address || "",
      receive_time: payload?.receive_time || "",
      guest_count: payload?.guest_count || "",
      note: payload?.note || ""
    };
    Object.entries(values).forEach(([name, value]) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) input.value = value;
    });

    $$("[name='quick_notices[]']", form).forEach((input) => {
      input.checked = (payload?.quick_notices || []).includes(input.value);
    });
    $$("[name^='items[']", form).forEach((input) => input.value = "0");
    Object.entries(payload?.items || {}).forEach(([id, quantity]) => {
      const input = form.querySelector(`[name="items[${CSS.escape(String(id))}]"]`);
      if (input) input.value = String(quantity || 0);
    });
    $$("[name^='item_notes[']", form).forEach((input) => input.value = "");
    Object.entries(payload?.item_notes || {}).forEach(([id, note]) => {
      const input = form.querySelector(`[name="item_notes[${CSS.escape(String(id))}]"]`);
      if (input) input.value = note || "";
    });

    syncTypeFields(form, type);
    if (type !== "booking" && payment && !Array.from(payment.options).some((option) => option.selected && !option.disabled)) {
      setPaymentDefaultForType(form, type);
    }
    updateOrderForm(form);
  }

  async function syncDraftToServer(form, state, draft) {
    if (!form.dataset.draftSaveUrl || !draft || state.isSubmitting) return null;
    const formData = new FormData();
    formData.append("_csrf", csrfToken(form));
    formData.append("draft_id", String(draft.id || 0));
    formData.append("payload_json", JSON.stringify(draft.payload));

    state.drafts = state.drafts.map((item) => item.client_key === draft.client_key ? { ...item, sync_status: "saving" } : item);
    persistLocalDraftState(form, state);
    renderDraftPanel(form, state);

    const response = await fetch(form.dataset.draftSaveUrl, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      headers: { "X-Requested-With": "XMLHttpRequest" }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Không lưu được nháp");
    }

    const saved = data.draft ? normalizeDraft(data.draft) : null;
    const oldKey = draft.client_key;
    if (saved?.id) {
      saved.client_key = `server-${saved.id}`;
      const remaining = state.drafts.filter((item) => item.client_key !== oldKey && item.client_key !== saved.client_key);
      state.drafts = mergeDraftLists(data.drafts || [saved], [saved, ...remaining]);
      if (state.activeKey === oldKey) {
        state.activeKey = saved.client_key;
      }
      const input = $("[data-draft-id]", form);
      if (input && state.activeKey === saved.client_key) input.value = String(saved.id);
    } else {
      state.drafts = state.drafts.map((item) => item.client_key === oldKey ? { ...item, sync_status: "saved" } : item);
    }

    state.drafts = mergeDraftLists(data.drafts || [], state.drafts);
    persistLocalDraftState(form, state);
    renderDraftPanel(form, state);

    return saved;
  }

  function syncDraftInBackground(form, state, draft) {
    if (!draft || !draftHasContent(draft.payload)) return;
    syncDraftToServer(form, state, draft).catch((error) => {
      state.drafts = state.drafts.map((item) => item.client_key === draft.client_key ? { ...item, sync_status: "error" } : item);
      persistLocalDraftState(form, state);
      renderDraftPanel(form, state);
      toast(error.message || "Nháp chưa đồng bộ, vẫn đã lưu trên máy");
    });
  }

  async function saveDraftNow(form, state, force = false) {
    if (state.isApplying || state.isSubmitting) return null;
    const draft = upsertLocalDraft(form, state, { force });
    if (!draft) return null;
    await syncDraftToServer(form, state, draft);
    return getActiveDraft(state);
  }

  function queueDraftSave(form, state) {
    const draft = upsertLocalDraft(form, state);
    renderDraftPanel(form, state);
    if (state.saveTimer) clearTimeout(state.saveTimer);
    if (!draft) return;
    state.saveTimer = setTimeout(async () => {
      syncDraftInBackground(form, state, getActiveDraft(state));
    }, 450);
  }

  function deleteDraft(form, state, key) {
    const draft = state.drafts.find((item) => item.client_key === key);
    state.drafts = state.drafts.filter((item) => item.client_key !== key);
    if (state.activeKey === key) {
      state.activeKey = "";
      resetFormForNewDraft(form);
    }
    persistLocalDraftState(form, state);
    renderDraftPanel(form, state);

    if (!draft?.id || !form.dataset.draftsUrl) return;
    const formData = new FormData();
    formData.append("_csrf", csrfToken(form));
    fetch(`${form.dataset.draftsUrl}/${draft.id}/delete`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      headers: { "X-Requested-With": "XMLHttpRequest" }
    }).catch(() => toast("Đã xóa trên máy, server sẽ cập nhật khi tải lại"));
  }

  function initOrderForm() {
    const form = $("[data-order-create]");
    if (!form) return;
    const localDraftState = loadLocalDraftState(form);
    const state = {
      drafts: mergeDraftLists(initialOrderDrafts, localDraftState.drafts),
      activeKey: localDraftState.activeKey,
      saveTimer: null,
      isApplying: false,
      isSubmitting: false
    };
    if (state.activeKey && !state.drafts.some((draft) => draft.client_key === state.activeKey)) {
      state.activeKey = "";
    }
    if (state.activeKey && state.drafts.some((draft) => draft.client_key === state.activeKey)) {
      state.isApplying = true;
      const activeDraft = getActiveDraft(state);
      const draftId = $("[data-draft-id]", form);
      if (draftId) draftId.value = activeDraft?.id ? String(activeDraft.id) : "0";
      applyDraftPayload(form, activeDraft?.payload || {});
      state.isApplying = false;
    }
    persistLocalDraftState(form, state);

    form.addEventListener("click", async (event) => {
      const stepper = event.target.closest("[data-qty-step]");
      const category = event.target.closest("[data-category-filter]");
      const newDraft = event.target.closest("[data-new-draft]");
      const openDraft = event.target.closest("[data-open-draft]");
      const deleteDraftButton = event.target.closest("[data-delete-draft]");
      if (stepper) {
        const card = stepper.closest("[data-menu-card]");
        const input = $(".qty-input", card);
        const next = Math.max(0, parseInt(input.value || "0", 10) + parseInt(stepper.dataset.qtyStep, 10));
        input.value = next;
        updateOrderForm(form);
        queueDraftSave(form, state);
      }
      if (category) {
        $$("[data-category-filter]", form).forEach((node) => node.classList.remove("active"));
        category.classList.add("active");
        filterMenu(form);
      }
      if (newDraft) {
        event.preventDefault();
        if (state.saveTimer) clearTimeout(state.saveTimer);
        const currentDraft = upsertLocalDraft(form, state);
        syncDraftInBackground(form, state, currentDraft);
        state.activeKey = makeDraftKey();
        state.isApplying = true;
        resetFormForNewDraft(form);
        state.isApplying = false;
        persistLocalDraftState(form, state);
        renderDraftPanel(form, state);
        $("[name='customer_name']", form)?.focus();
      }
      if (openDraft) {
        event.preventDefault();
        if (state.saveTimer) clearTimeout(state.saveTimer);
        const currentDraft = upsertLocalDraft(form, state);
        syncDraftInBackground(form, state, currentDraft);
        const draft = state.drafts.find((item) => item.client_key === openDraft.dataset.openDraft);
        if (!draft) {
          toast("Không tìm thấy đơn nháp");
          return;
        }
        state.activeKey = draft.client_key;
        state.isApplying = true;
        const draftId = $("[data-draft-id]", form);
        if (draftId) draftId.value = draft.id ? String(draft.id) : "0";
        applyDraftPayload(form, draft.payload || {});
        state.isApplying = false;
        persistLocalDraftState(form, state);
        renderDraftPanel(form, state);
        $("[name='customer_name']", form)?.focus();
      }
      if (deleteDraftButton) {
        event.preventDefault();
        deleteDraft(form, state, deleteDraftButton.dataset.deleteDraft);
      }
      if (event.target.closest("[data-copy-preview]")) {
        await copyText($("[data-order-preview]", form).value);
      }
      if (event.target.closest("[data-copy-customer]")) {
        await copyText(renderCustomerText(collectOrder(form)));
      }
    });

    form.addEventListener("input", () => {
      updateOrderForm(form);
      filterMenu(form);
      renderDraftPanel(form, state);
      queueDraftSave(form, state);
    });
    form.addEventListener("change", () => {
      updateOrderForm(form);
      renderDraftPanel(form, state);
      queueDraftSave(form, state);
    });
    form.addEventListener("submit", () => {
      state.isSubmitting = true;
      if (state.saveTimer) clearTimeout(state.saveTimer);
      const activeDraft = getActiveDraft(state);
      const draftId = $("[data-draft-id]", form);
      if (draftId && activeDraft?.id) draftId.value = String(activeDraft.id);
      if (activeDraft) {
        state.drafts = state.drafts.filter((draft) => draft.client_key !== activeDraft.client_key);
        persistLocalDraftState(form, state);
      }
    });

    updateOrderForm(form);
    renderDraftPanel(form, state);
  }

  function filterMenu(form) {
    const query = ($("[data-menu-search]", form)?.value || "").toLowerCase();
    const category = $("[data-category-filter].active", form)?.dataset.categoryFilter || "all";
    $$("[data-menu-card]", form).forEach((card) => {
      const categoryMatch = category === "all" || card.dataset.category === category;
      const queryMatch = !query || (card.dataset.name || "").toLowerCase().includes(query);
      card.hidden = !(categoryMatch && queryMatch);
    });
  }

  async function markSentAfterCopy(button) {
    if (button.dataset.copyAutoSent !== "1" || !button.dataset.copySentUrl) {
      return;
    }

    const formData = new FormData();
    const csrf = document.querySelector("input[name='_csrf']");
    if (csrf) {
      formData.append("_csrf", csrf.value);
    }

    try {
      const response = await fetch(button.dataset.copySentUrl, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });
      const payload = await response.json();
      if (!response.ok) {
        toast(payload.message || "Không chuyển được trạng thái");
        return;
      }
      if (!payload.changed) {
        return;
      }

      const statusPill = $("[data-order-status-pill]");
      if (statusPill) {
        statusPill.textContent = payload.label || "Đã gửi CN";
        statusPill.className = "pill sent";
      }
      toast("Đã chuyển Đã gửi CN");
    } catch (error) {
      toast("Đã copy, nhưng chưa chuyển được trạng thái");
    }
  }

  document.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-copy-target]");
    if (copyButton) {
      const target = $(copyButton.dataset.copyTarget);
      if (target) {
        const copied = await copyText(target.value || target.textContent || "");
        if (copied) {
          await markSentAfterCopy(copyButton);
        }
      }
      return;
    }

    const settingsSave = event.target.closest(".settings-panel table button[type='submit']");
    if (!settingsSave) return;

    const row = settingsSave.closest("tr");
    const sourceForm = settingsSave.closest("form");
    if (!row) return;

    event.preventDefault();
    const form = document.createElement("form");
    form.method = "post";
    form.action = sourceForm?.getAttribute("action")
      || (row.querySelector("[name='catalog']") ? "/settings/catalog" : "/settings/users");
    form.hidden = true;

    row.querySelectorAll("input, select, textarea").forEach((field) => {
      if (!field.name || field.disabled) return;
      if ((field.type === "checkbox" || field.type === "radio") && !field.checked) return;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = field.name;
      input.value = field.value;
      form.appendChild(input);
    });

    if (!form.querySelector("[name='_csrf']")) {
      const csrf = document.querySelector("input[name='_csrf']");
      if (csrf) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "_csrf";
        input.value = csrf.value;
        form.appendChild(input);
      }
    }

    document.body.appendChild(form);
    form.submit();
  });

  initOrderForm();
})();
