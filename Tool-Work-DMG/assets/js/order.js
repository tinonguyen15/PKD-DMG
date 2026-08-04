(function () {
  const U = window.DMGUtils;

  function getStaff(state) {
    return state.staffProfiles.find((staff) => staff.id === state.currentStaffId) || null;
  }

  function getCartLines(state, draft = state.draftOrder) {
    const itemById = Object.fromEntries(state.menuItems.map((item) => [item.id, item]));
    return Object.entries(draft.items || {})
      .map(([id, quantity]) => {
        const item = itemById[id];
        if (!item || !quantity) return null;
        return {
          item,
          id,
          quantity,
          lineTotal: quantity * item.price
        };
      })
      .filter(Boolean);
  }

  function getTotals(state, draft = state.draftOrder) {
    const subtotal = getCartLines(state, draft).reduce((sum, line) => sum + line.lineTotal, 0);
    return { subtotal, total: subtotal };
  }

  function isDeliveryOrder(draft) {
    return draft.orderType === "delivery";
  }

  function getOrderTypeLabel(orderType) {
    if (orderType === "pickup") return "Ghé lấy";
    if (orderType === "booking") return "Đặt bàn";
    return "Mang về";
  }

  function getOrderTitle(draft) {
    const base = getOrderBaseTitle(draft);
    return draft.status ? `${base} - ${draft.status}` : base;
  }

  function getOrderBaseTitle(draft) {
    const titles = {
      delivery: "ĐƠN MANG VỀ",
      pickup: "ĐƠN GHÉ LẤY",
      booking: "ĐƠN ĐẶT BÀN"
    };
    return titles[draft.orderType] || titles.delivery;
  }

  function getTimeLabel(draft) {
    if (draft.orderType === "pickup") return "Thời gian ghé lấy";
    if (draft.orderType === "booking") return "Thời gian đặt bàn";
    return "Thời gian nhận";
  }

  function getDraftSource(state, draft = state.draftOrder) {
    return draft.source || state.settings?.defaultOrderSource || "";
  }

  function getSourceCustomerPrefix(sourceName) {
    const source = U.normalize(sourceName);
    if (!source) return "";
    if (source.includes("fb ads") || (source.includes("facebook") && source.includes("ads"))) return "FB ads - ";
    if (source === "fb" || source.includes("facebook") || source.includes("fb ")) return "FB - ";
    if (source.includes("zalo")) return "Zalo - ";
    if (source.includes("hotline")) return "Hotline - ";
    if (source.includes("google")) return "Google - ";
    if (source.includes("khach quen")) return "Khách quen - ";
    if (source.includes("walk")) return "Walk-in - ";
    if (source.includes("khac")) return "Khác - ";
    return `${String(sourceName || "").trim()} - `;
  }

  function getCustomerPrefixCandidates(state, sourceName = "") {
    const sourceNames = [
      sourceName,
      "Facebook",
      "FB",
      "FB ads",
      "Zalo",
      "Hotline",
      "Google",
      "Khách quen",
      "Walk-in",
      "Khác",
      ...(state?.orderSources || []).map((source) => source.name)
    ];
    return [...new Set(sourceNames.map(getSourceCustomerPrefix).filter(Boolean))]
      .sort((a, b) => b.length - a.length);
  }

  function stripCustomerNamePrefix(value, state, sourceName = "") {
    const text = String(value || "").trimStart();
    const normalizedText = U.normalize(text);
    const prefix = getCustomerPrefixCandidates(state, sourceName)
      .find((candidate) => normalizedText.startsWith(U.normalize(candidate)));
    return prefix ? text.slice(prefix.length).trimStart() : text;
  }

  function getCustomerSourcePrefix(state, draft = state.draftOrder) {
    return getSourceCustomerPrefix(getDraftSource(state, draft));
  }

  function getCustomerRawName(state, draft = state.draftOrder) {
    return stripCustomerNamePrefix(draft.customerName, state, getDraftSource(state, draft)).trim();
  }

  function getCustomerDisplayName(state, draft = state.draftOrder) {
    const rawName = getCustomerRawName(state, draft);
    if (!rawName) return "";
    return `${getCustomerSourcePrefix(state, draft)}${rawName}`;
  }

  function getEmptyDraftForState(state) {
    return {
      ...window.DMG_EMPTY_DRAFT_ORDER(),
      source: state.settings?.defaultOrderSource || ""
    };
  }

  const ORDER_CODE_PATTERN = /^(\d{4})-(\d{3})$/;

  function getDateOrderCode(date = new Date()) {
    return `${String(date.getDate()).padStart(2, "0")}${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function getNextOrderCode(state, createdAt = new Date()) {
    const dateCode = getDateOrderCode(createdAt);
    const maxSequence = (state.orderHistory || []).reduce((max, order) => {
      const match = String(order.orderCode || "").match(ORDER_CODE_PATTERN);
      if (!match || match[1] !== dateCode) return max;
      return Math.max(max, Number(match[2]) || 0);
    }, 0);
    return `${dateCode}-${String(maxSequence + 1).padStart(3, "0")}`;
  }

  function getOrderDateCode(order, fallbackDate = new Date()) {
    const dateKeyMatch = String(order?.createdDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateKeyMatch) return `${dateKeyMatch[3]}${dateKeyMatch[2]}`;
    const date = order?.createdAt ? new Date(order.createdAt) : fallbackDate;
    return Number.isNaN(date.getTime()) ? getDateOrderCode(fallbackDate) : getDateOrderCode(date);
  }

  function normalizeOrderCodes(state) {
    const usedSequences = {};
    (state.orderHistory || []).forEach((order) => {
      const match = String(order.orderCode || "").match(ORDER_CODE_PATTERN);
      if (!match) return;
      usedSequences[match[1]] = Math.max(usedSequences[match[1]] || 0, Number(match[2]) || 0);
    });

    const ordersToUpdate = [...(state.orderHistory || [])]
      .filter((order) => !ORDER_CODE_PATTERN.test(String(order.orderCode || "")))
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));

    ordersToUpdate.forEach((order) => {
      const dateCode = getOrderDateCode(order);
      const nextSequence = (usedSequences[dateCode] || 0) + 1;
      usedSequences[dateCode] = nextSequence;
      order.orderCode = `${dateCode}-${String(nextSequence).padStart(3, "0")}`;
    });

    return ordersToUpdate.length > 0;
  }

  function getOrderCode(order) {
    if (order?.orderCode) return order.orderCode;
    const dateCode = getOrderDateCode(order);
    const id = String(order?.id || "");
    const seedMatch = id.match(/(\d{3,})$/);
    if (seedMatch) return `${dateCode}-${String(Number(seedMatch[1].slice(-3)) || 1).padStart(3, "0")}`;
    const compact = id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
    return compact ? `${dateCode}-${compact}` : `${dateCode}-MỚI`;
  }

  function getActiveOrder(state) {
    const id = state.draftOrder?.editingOrderId || "";
    return state.orderHistory.find((order) => order.id === id) || null;
  }

  function getOrderStage(order) {
    return order?.workflowStatus || "processing";
  }

  function getOpenOrders(state) {
    const activeId = state.draftOrder?.editingOrderId || "";
    const today = U.todayKey();
    return [...(state.orderHistory || [])]
      .filter((order) => {
        const stage = getOrderStage(order);
        if (stage === "deleted") return false;
        if (order.id === activeId) return true;
        const sameDay = order.createdDate === today || String(order.createdAt || "").startsWith(today);
        return sameDay && stage !== "completed";
      })
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  }

  function markOrderDeleted(order) {
    if (!order) return order;
    const previousStage = getOrderStage(order);
    const now = new Date().toISOString();
    order.workflowStatus = "deleted";
    order.deletedAt = now;
    order.deletedFromStage = previousStage === "deleted" ? (order.deletedFromStage || "processing") : previousStage;
    order.updatedAt = now;
    return order;
  }

  function restoreDeletedOrder(order) {
    if (!order) return order;
    const restoredStage = order.deletedFromStage && order.deletedFromStage !== "deleted" ? order.deletedFromStage : "processing";
    const now = new Date().toISOString();
    order.workflowStatus = restoredStage;
    order.updatedAt = now;
    order.restoredAt = now;
    delete order.deletedAt;
    return order;
  }

  function getOrderItemCount(order) {
    return (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }

  function formatOrderShortTime(order) {
    const date = new Date(order?.updatedAt || order?.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  function getActiveDraftSummaryText(state, draft = state.draftOrder) {
    const activeOrder = getActiveOrder(state);
    const name = getCustomerDisplayName(state, draft) || "Chưa nhập tên";
    const totals = getTotals(state, draft);
    const savedAt = activeOrder ? formatOrderShortTime(activeOrder) : "";
    return `${name} | ${getDraftItemQuantity(draft)} món | ${U.formatMoney(totals.total)}${savedAt ? ` | Tự lưu ${savedAt}` : ""}`;
  }

  function formatShortPrice(value) {
    const price = Number(value) || 0;
    return price >= 1000 && price % 1000 === 0 ? `${price / 1000}k` : U.formatMoney(price);
  }

  function getAbbreviationRule(state, item) {
    const rules = U.sortByOrder(state.settings?.abbreviationRules || []).filter((rule) => rule.active !== false);
    const source = U.normalize(`${item.name} ${item.branchName || ""} ${item.customerName || ""} ${item.shortName || ""}`);
    return rules.find((rule) => source.includes(U.normalize(rule.match)));
  }

  function getItemMessageName(state, item, audience = "branch") {
    const rule = getAbbreviationRule(state, item);
    if (audience === "customer") {
      return item.customerName || item.name || item.branchName || item.shortName || rule?.output || "";
    }
    return item.branchName || rule?.output || item.shortName || item.name || item.customerName || "";
  }

  function getSavedItemName(item, audience = "branch") {
    if (audience === "customer") {
      return item.customerName || item.name || item.branchName || item.shortName || "";
    }
    return item.branchName || item.shortName || item.name || item.customerName || "";
  }

  function getDisplayItemName(state, item) {
    return getItemMessageName(state, item, "branch");
  }

  function formatSimpleItemLine(state, line, audience = "branch") {
    const rule = getAbbreviationRule(state, line.item);
    const name = getItemMessageName(state, line.item, audience);
    const price = rule?.showPrice ? ` ${formatShortPrice(line.item.price)}` : "";
    return `${line.quantity} ${name}${price}`;
  }

  function getSimpleItemSummaryLines(state, draft = state.draftOrder, audience = "branch") {
    return getCartLines(state, draft).map((line) => formatSimpleItemLine(state, line, audience));
  }

  function getItemSummary(state, draft = state.draftOrder, audience = "customer") {
    const lines = getCartLines(state, draft);
    return lines.length
      ? lines.map((line) => formatSimpleItemLine(state, line, audience)).join(", ")
      : "Chưa chọn món";
  }

  function generateOrderText(state, draft = state.draftOrder) {
    const itemLines = getSimpleItemSummaryLines(state, draft, "branch");
    const customerName = getCustomerDisplayName(state, draft);
    const lines = [
      getOrderTitle(draft),
      "",
      `• Chi nhánh: ${draft.branch || "Chưa chọn"}`,
      `• Tên: ${customerName || "Chưa nhập"}`,
      `• SĐT: ${draft.phone || "Chưa nhập"}`
    ];
    if (isDeliveryOrder(draft)) lines.push(`• Địa chỉ: ${draft.address || "Chưa nhập"}`);
    if (itemLines.length) {
      lines.push(`• Món: ${itemLines[0]}`);
      lines.push(...itemLines.slice(1));
    } else {
      lines.push("• Món: Chưa chọn món");
    }
    const fallbackTime = draft.orderType === "delivery" ? "Giao ngay" : "Chưa nhập";
    lines.push(`• ${getTimeLabel(draft)}: ${draft.receiveTime || fallbackTime}`);
    return lines.join("\n");
  }

  function generateCustomerCheckText(state, draft = state.draftOrder) {
    const itemLines = getSimpleItemSummaryLines(state, draft, "customer");
    const totals = getTotals(state, draft);
    const customerName = getCustomerDisplayName(state, draft);
    const lines = [
      getOrderBaseTitle(draft),
      "",
      `• Chi nhánh: ${draft.branch || "..."}`,
      `• Tên: ${customerName || "..."}`,
      `• SĐT: ${draft.phone || "..."}`
    ];
    if (isDeliveryOrder(draft)) lines.push(`• Địa chỉ: ${draft.address || "..."}`);
    if (itemLines.length) {
      lines.push(`• Món: ${itemLines[0]}`);
      lines.push(...itemLines.slice(1));
    } else {
      lines.push("• Món: ...");
    }
    lines.push(`== Tổng tiền món: ${U.formatMoney(totals.total)} ==`);
    lines.push(`• ${getTimeLabel(draft)}: ${draft.receiveTime || "..."}`);
    lines.push(`• Hình thức thanh toán: ${draft.paymentMethod || "..."}`);
    return lines.join("\n");
  }

  function validateBeforeFinalAction(state) {
    const staff = getStaff(state);
    if (!staff) return "Vui lòng chọn hoặc tạo mã nhân viên trước.";
    if (!getCustomerRawName(state)) return "Tên khách hàng là bắt buộc.";
    if (!state.draftOrder.phone.trim()) return "Số điện thoại là bắt buộc.";
    return "";
  }

  function createSavedOrder(state, draft = state.draftOrder) {
    const staff = getStaff(state);
    const totals = getTotals(state, draft);
    const customerName = getCustomerDisplayName(state, draft);
    const id = draft.editingOrderId || U.uid("order");
    const createdDate = new Date();
    const createdAt = createdDate.toISOString();
    return {
      id,
      orderCode: getNextOrderCode(state, createdDate),
      createdAt,
      updatedAt: createdAt,
      createdDate: U.todayKey(),
      workflowStatus: "processing",
      staffId: staff ? staff.id : "",
      staffName: staff ? staff.name : "",
      orderType: draft.orderType,
      source: getDraftSource(state, draft),
      status: draft.status,
      customerName,
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      branch: draft.branch,
      items: getCartLines(state, draft).map((line) => ({
        id: line.item.id,
        name: line.item.name,
        branchName: getItemMessageName(state, line.item, "branch"),
        customerName: getItemMessageName(state, line.item, "customer"),
        shortName: getItemMessageName(state, line.item, "branch"),
        price: line.item.price,
        quantity: line.quantity,
        lineTotal: line.lineTotal
      })),
      subtotal: totals.subtotal,
      total: totals.total,
      paymentMethod: draft.paymentMethod,
      receiveTime: draft.receiveTime,
      note: draft.note,
      generatedText: generateOrderText(state, draft)
    };
  }

  function updateSavedOrderFromDraft(state, order, draft) {
    const staff = getStaff(state);
    const totals = getTotals(state, draft);
    const lines = getCartLines(state, draft);
    const customerName = getCustomerDisplayName(state, draft);
    return {
      ...order,
      orderCode: order.orderCode || getOrderCode(order),
      updatedAt: new Date().toISOString(),
      staffId: staff ? staff.id : (order.staffId || ""),
      staffName: staff ? staff.name : (order.staffName || ""),
      orderType: draft.orderType,
      source: getDraftSource(state, draft),
      status: draft.status,
      customerName,
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      branch: draft.branch,
      items: lines.map((line) => ({
        id: line.item.id,
        name: line.item.name,
        branchName: getItemMessageName(state, line.item, "branch"),
        customerName: getItemMessageName(state, line.item, "customer"),
        shortName: getItemMessageName(state, line.item, "branch"),
        price: line.item.price,
        quantity: line.quantity,
        lineTotal: line.lineTotal
      })),
      subtotal: totals.subtotal,
      total: totals.total,
      paymentMethod: draft.paymentMethod,
      receiveTime: draft.receiveTime,
      note: draft.note,
      generatedText: generateOrderText(state, draft)
    };
  }

  function renderOrder(state) {
    const draft = state.draftOrder;
    const isFullSurface = document.body.dataset.surface === "full";
    const categories = U.sortByOrder(state.menuCategories);
    const activeItems = U.sortByOrder(state.menuItems).filter((item) => item.active);
    const filter = state.ui.orderCategory || "all";
    const query = U.normalize(state.ui.orderSearch);
    const visibleItems = activeItems.filter((item) => {
      const matchesCategory = filter === "all" || item.category === filter;
      const matchesQuery = !query || U.normalize(`${item.name} ${item.branchName || ""} ${item.customerName || ""} ${item.shortName || ""}`).includes(query);
      return matchesCategory && matchesQuery;
    });
    const totals = getTotals(state);
    const lines = getCartLines(state);
    const branchOptions = U.sortByOrder(state.branches).filter((branch) => branch.active !== false).map((branch) => `
      <option value="${U.escapeHtml(branch.name)}" ${draft.branch === branch.name ? "selected" : ""}>${U.escapeHtml(branch.name)}</option>
    `).join("");
    const selectedSource = getDraftSource(state, draft);
    const customerPrefix = getCustomerSourcePrefix(state, draft);
    const customerNameInputValue = getCustomerRawName(state, draft);
    const activeOrder = getActiveOrder(state);
    const openOrders = getOpenOrders(state);
    const activeCode = getOrderCode(activeOrder || { id: draft.editingOrderId });
    const sourceButtons = U.sortByOrder(state.orderSources).filter((source) => source.active !== false).map((source) => {
      const isDefault = state.settings?.defaultOrderSource === source.name;
      return `
        <button class="source-chip ${selectedSource === source.name ? "active" : ""}" data-action="order-source" data-value="${U.escapeHtml(source.name)}">
          ${U.escapeHtml(source.name)}${isDefault ? " *" : ""}
        </button>
      `;
    }).join("");
    const paymentOptions = U.sortByOrder(state.paymentMethods).map((method) => `
      <option value="${U.escapeHtml(method.name)}" ${draft.paymentMethod === method.name ? "selected" : ""}>${U.escapeHtml(method.name)}</option>
    `).join("");
    const staff = getStaff(state);

    return `
      <div class="order-screen">
        <section class="order-toolbar">
          <div>
            <p class="eyebrow">Đang bán</p>
            <h1>Tạo đơn nhanh</h1>
            <span class="muted">${staff ? `${U.escapeHtml(staff.id)} - ${U.escapeHtml(staff.name)}` : "Chưa chọn nhân viên"}</span>
          </div>
          <div class="toolbar-actions">
            ${isFullSurface ? "" : `<button class="btn ghost" data-action="open-full">Full màn</button>`}
            <button class="btn ghost" data-action="new-order">Tạo đơn mới</button>
          </div>
        </section>

        <section class="active-order-panel">
          <div class="active-order-summary">
            <span>Đơn đang mở</span>
            <strong>${U.escapeHtml(activeCode)}</strong>
            <p data-active-order-info>${U.escapeHtml(getActiveDraftSummaryText(state, draft))}</p>
          </div>
          <div class="open-order-strip">
            ${openOrders.map((order) => `
              <button class="open-order-chip ${order.id === draft.editingOrderId ? "active" : ""}" data-action="open-draft-order" data-id="${U.escapeHtml(order.id)}">
                <strong>${U.escapeHtml(getOrderCode(order))}</strong>
                <span>${U.escapeHtml(order.customerName || "Chưa tên")} | ${getOrderItemCount(order)} món | ${U.formatMoney(order.total || 0)}</span>
              </button>
            `).join("")}
          </div>
        </section>

        <section class="quick-form">
          <div class="segmented">
            <button class="${draft.orderType === "delivery" ? "active" : ""}" data-action="order-type" data-value="delivery">Mang về</button>
            <button class="${draft.orderType === "pickup" ? "active" : ""}" data-action="order-type" data-value="pickup">Khách ghé lấy</button>
            <button class="${draft.orderType === "booking" ? "active" : ""}" data-action="order-type" data-value="booking">Đặt bàn</button>
          </div>
          <div class="order-source-select">
            <span>Nguồn đơn</span>
            <div class="source-button-row">
              ${sourceButtons || `<button class="source-chip active" disabled>Chưa có nguồn</button>`}
            </div>
          </div>
          <div class="form-grid">
            <label class="customer-name-field">Tên khách
              <div class="locked-input">
                ${customerPrefix ? `<span class="locked-input-prefix">${U.escapeHtml(customerPrefix)}</span>` : ""}
                <input data-draft="customerName" value="${U.escapeHtml(customerNameInputValue)}" placeholder="Bắt buộc">
              </div>
            </label>
            <label>Số điện thoại <input data-draft="phone" value="${U.escapeHtml(draft.phone)}" placeholder="Bắt buộc"></label>
            <label>Chi nhánh
              <select data-draft="branch">
                <option value="">Chưa chọn</option>
                ${branchOptions}
              </select>
            </label>
            ${isDeliveryOrder(draft) ? `<label class="wide">Địa chỉ <input data-draft="address" value="${U.escapeHtml(draft.address)}" placeholder="Địa chỉ giao hàng"></label>` : ""}
            <label>${getTimeLabel(draft)} <input data-draft="receiveTime" value="${U.escapeHtml(draft.receiveTime)}" placeholder="${draft.orderType === "delivery" ? "Giao ngay" : "Ví dụ: 17h50"}"></label>
            <label>Thanh toán
              <select data-draft="paymentMethod">${paymentOptions}</select>
            </label>
            <label class="wide">Ghi chú <input data-draft="note" value="${U.escapeHtml(draft.note)}" placeholder="Không có"></label>
          </div>
        </section>

        <section class="menu-tools">
          <input class="search" data-action="menu-search" value="${U.escapeHtml(state.ui.orderSearch)}" placeholder="Tìm món">
          <div class="chip-row">
            <button class="chip ${filter === "all" ? "active" : ""}" data-action="category-filter" data-value="all">Tất cả</button>
            ${categories.map((cat) => `<button class="chip ${filter === cat.id ? "active" : ""}" data-action="category-filter" data-value="${U.escapeHtml(cat.id)}">${U.escapeHtml(cat.name)}</button>`).join("")}
          </div>
        </section>

        <section class="menu-list">
          ${visibleItems.map((item) => {
            const qty = draft.items[item.id] || 0;
            return `
              <article class="menu-card" data-action="add-menu-item" data-id="${U.escapeHtml(item.id)}" title="Bấm để thêm món">
                <div class="dish-thumb">${item.imageData ? `<img src="${U.escapeHtml(item.imageData)}" alt="">` : `<span>${U.escapeHtml(item.imagePlaceholder || item.name.slice(0, 2))}</span>`}</div>
                <div class="dish-info">
                  <strong>${U.escapeHtml(item.name)}</strong>
                  <span>${U.formatMoney(item.price)} / ${U.escapeHtml(item.unit)}</span>
                </div>
                <div class="qty-control">
                  <button data-action="qty" data-id="${U.escapeHtml(item.id)}" data-delta="-1" ${qty ? "" : "disabled"}>-</button>
                  <b>${qty}</b>
                  <button data-action="qty" data-id="${U.escapeHtml(item.id)}" data-delta="1">+</button>
                </div>
              </article>
            `;
          }).join("") || `<p class="empty">Không tìm thấy món.</p>`}
        </section>

        <section class="cart-panel">
          <details ${isFullSurface || state.ui.previewOpen ? "open" : ""}>
            <summary>Nội dung gửi chi nhánh</summary>
            <textarea readonly>${U.escapeHtml(generateOrderText(state))}</textarea>
          </details>
          <div class="cart-lines">
            ${lines.map((line) => `
              <div class="cart-line">
                <span>${line.quantity} ${U.escapeHtml(getItemMessageName(state, line.item, "branch"))}</span>
                <b>${U.formatMoney(line.lineTotal)}</b>
                <button class="icon-btn" data-action="remove-cart" data-id="${U.escapeHtml(line.id)}" title="Xóa món">x</button>
              </div>
            `).join("") || `<p class="empty small">Chưa chọn món.</p>`}
          </div>
          <div class="total-box">
            <div class="grand-total"><span>TỔNG THANH TOÁN</span><b>${U.formatMoney(totals.total)}</b></div>
          </div>
          <div class="primary-actions">
            <button class="btn primary" data-action="copy-order">Sao chép đơn</button>
            <button class="btn primary send-customer" data-action="send-customer-order">Gửi KH</button>
            <button class="btn secondary" data-action="save-order">Tự lưu</button>
            <button class="btn danger" data-action="delete-current-order">Xóa đơn</button>
          </div>
        </section>
      </div>
    `;
  }

  function getDraftItemQuantity(draft) {
    return Object.values(draft.items || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
  }

  async function changeDraftItemQuantity(app, id, delta) {
    const draft = app.state.draftOrder;
    const next = Math.max(0, (draft.items[id] || 0) + delta);
    if (next) draft.items[id] = next;
    else delete draft.items[id];
    await saveCurrentDraftOrder(app);
    app.render();
  }

  function hasDraftContent(draft) {
    return Boolean(
      String(draft.customerName || "").trim()
      || String(draft.phone || "").trim()
      || String(draft.address || "").trim()
      || String(draft.branch || "").trim()
      || String(draft.receiveTime || "").trim()
      || String(draft.note || "").trim()
      || getDraftItemQuantity(draft)
    );
  }

  function applyHistoryLimit(state) {
    const limit = Number(state.settings?.historyLimit) || 100;
    state.orderHistory = [...(state.orderHistory || [])].slice(0, limit);
  }

  function upsertDraftOrder(state) {
    state.orderHistory = state.orderHistory || [];
    state.draftOrder = state.draftOrder || getEmptyDraftForState(state);
    let order = state.orderHistory.find((item) => item.id === state.draftOrder.editingOrderId);
    if (!order) {
      order = createSavedOrder(state, state.draftOrder);
      state.draftOrder.editingOrderId = order.id;
      state.orderHistory = [order, ...state.orderHistory];
      if (hasDraftContent(state.draftOrder)) applyHistoryLimit(state);
      return order;
    }
    const updated = updateSavedOrderFromDraft(state, order, state.draftOrder);
    state.orderHistory = [updated, ...state.orderHistory.filter((item) => item.id !== order.id)];
    if (hasDraftContent(state.draftOrder)) applyHistoryLimit(state);
    return updated;
  }

  async function persistOrderState(state) {
    await window.DMGStorage.setMany({
      draftOrder: state.draftOrder,
      orderHistory: state.orderHistory
    });
  }

  async function saveCurrentDraftOrder(app) {
    const order = upsertDraftOrder(app.state);
    await persistOrderState(app.state);
    return order;
  }

  async function ensureActiveOrder(state) {
    state.draftOrder = state.draftOrder || getEmptyDraftForState(state);
    state.orderHistory = state.orderHistory || [];
    normalizeOrderCodes(state);
    const activeOrder = state.orderHistory.find((order) => order.id === state.draftOrder.editingOrderId);
    if (activeOrder && getOrderStage(activeOrder) === "deleted") {
      state.draftOrder = getEmptyDraftForState(state);
    }
    upsertDraftOrder(state);
    await persistOrderState(state);
    return state;
  }

  async function createNewDraftOrder(app) {
    const currentDraft = app.state.draftOrder || getEmptyDraftForState(app.state);
    if (currentDraft.editingOrderId && !hasDraftContent(currentDraft)) {
      await saveCurrentDraftOrder(app);
      return getActiveOrder(app.state);
    }
    await saveCurrentDraftOrder(app);
    app.state.draftOrder = getEmptyDraftForState(app.state);
    const order = upsertDraftOrder(app.state);
    await persistOrderState(app.state);
    return order;
  }

  async function openSavedOrder(app, id) {
    await saveCurrentDraftOrder(app);
    const order = app.state.orderHistory.find((item) => item.id === id);
    if (!order) return null;
    app.state.draftOrder = window.DMGOrder.orderToDraft(order);
    app.state.draftOrder.editingOrderId = order.id;
    await persistOrderState(app.state);
    return order;
  }

  function updateOrderPreview(root, state) {
    const preview = root.querySelector(".cart-panel textarea");
    if (preview) preview.value = generateOrderText(state);
  }

  function updateActiveOrderPanel(root, state) {
    const info = root.querySelector("[data-active-order-info]");
    if (info) info.textContent = getActiveDraftSummaryText(state);
  }

  function setDraftFieldFromInput(input, app) {
    const key = input.dataset.draft;
    let value = input.value;
    if (key === "customerName") {
      value = stripCustomerNamePrefix(value, app.state, getDraftSource(app.state));
      if (input.value !== value) input.value = value;
    }
    app.state.draftOrder[key] = value;
  }

  function bindOrder(root, app) {
    root.querySelectorAll("[data-draft]").forEach((input) => {
      input.addEventListener("input", async () => {
        setDraftFieldFromInput(input, app);
        updateOrderPreview(root, app.state);
        await saveCurrentDraftOrder(app);
        updateActiveOrderPanel(root, app.state);
      });
      input.addEventListener("change", async () => {
        setDraftFieldFromInput(input, app);
        updateOrderPreview(root, app.state);
        await saveCurrentDraftOrder(app);
        updateActiveOrderPanel(root, app.state);
      });
    });
    root.querySelectorAll("[data-money-draft]").forEach((input) => {
      input.addEventListener("input", async () => {
        app.state.draftOrder[input.dataset.moneyDraft] = U.parseMoney(input.value);
        updateOrderPreview(root, app.state);
        await saveCurrentDraftOrder(app);
        updateActiveOrderPanel(root, app.state);
      });
      input.addEventListener("change", async () => {
        app.state.draftOrder[input.dataset.moneyDraft] = U.parseMoney(input.value);
        updateOrderPreview(root, app.state);
        await saveCurrentDraftOrder(app);
        updateActiveOrderPanel(root, app.state);
      });
    });
  }

  async function handleOrderAction(action, target, app) {
    const draft = app.state.draftOrder;
    if (action === "open-full") {
      chrome.tabs.create({ url: chrome.runtime.getURL("app.html") });
      return;
    }
    if (action === "new-order") {
      const order = await createNewDraftOrder(app);
      app.render();
      U.toast(`Đã mở ${getOrderCode(order)}`);
      return;
    }
    if (action === "open-draft-order") {
      const order = await openSavedOrder(app, target.dataset.id);
      if (!order) return U.toast("Không tìm thấy đơn cần mở.", "error");
      app.render();
      U.toast(`Đã mở ${getOrderCode(order)}`);
      return;
    }
    if (action === "order-type") {
      draft.orderType = target.dataset.value;
      await saveCurrentDraftOrder(app);
      app.render();
      return;
    }
    if (action === "order-source") {
      draft.source = target.dataset.value;
      await saveCurrentDraftOrder(app);
      app.render();
      return;
    }
    if (action === "menu-search") {
      app.state.ui.orderSearch = target.value;
      app.render();
      return;
    }
    if (action === "category-filter") {
      app.state.ui.orderCategory = target.dataset.value;
      app.render();
      return;
    }
    if (action === "qty") {
      await changeDraftItemQuantity(app, target.dataset.id, Number(target.dataset.delta));
      return;
    }
    if (action === "add-menu-item") {
      await changeDraftItemQuantity(app, target.dataset.id, 1);
      return;
    }
    if (action === "remove-cart") {
      delete draft.items[target.dataset.id];
      await saveCurrentDraftOrder(app);
      app.render();
      return;
    }
    if (action === "copy-order") {
      const error = validateBeforeFinalAction(app.state);
      if (error) return U.toast(error, "error");
      const order = await saveCurrentDraftOrder(app);
      await U.copyText(generateOrderText(app.state));
      if (getOrderStage(order) === "processing") {
        order.workflowStatus = "sent";
        order.updatedAt = new Date().toISOString();
        await persistOrderState(app.state);
      }
      U.toast("Đã sao chép nội dung đơn");
      return;
    }
    if (action === "send-customer-order") {
      if (target.disabled) return;
      const error = validateBeforeFinalAction(app.state);
      if (error) return U.toast(error, "error");
      if (!window.DMGMessages?.sendMessageToActiveChat) return U.toast("Chưa tải được chức năng gửi tin.", "error");
      const originalText = target.textContent;
      target.disabled = true;
      target.textContent = "Đang gửi";
      try {
        await saveCurrentDraftOrder(app);
        await window.DMGMessages.sendMessageToActiveChat(generateCustomerCheckText(app.state));
        U.toast("Đã gửi đơn cho khách");
      } catch (error) {
        const message = window.DMGMessages.getSendErrorMessage
          ? window.DMGMessages.getSendErrorMessage(error)
          : (error.message || "Không gửi được đơn cho khách.");
        U.toast(message, "error");
      } finally {
        target.disabled = false;
        target.textContent = originalText;
      }
      return;
    }
    if (action === "save-order") {
      const order = await saveCurrentDraftOrder(app);
      app.render();
      U.toast(`Đã tự lưu ${getOrderCode(order)}`);
      return;
    }
    if (action === "delete-current-order") {
      const order = await saveCurrentDraftOrder(app);
      const ok = await U.modal({
        title: `Xóa ${getOrderCode(order)}?`,
        body: "Đơn sẽ chuyển sang mục Đã xóa trong tab Đơn hàng và có thể khôi phục lại để sửa tiếp.",
        confirmText: "Xóa đơn",
        danger: true
      });
      if (!ok) return;
      markOrderDeleted(order);
      app.state.draftOrder = getEmptyDraftForState(app.state);
      const nextOrder = upsertDraftOrder(app.state);
      await persistOrderState(app.state);
      app.render();
      U.toast(`Đã xóa ${getOrderCode(order)}. Đang mở ${getOrderCode(nextOrder)}`);
      return;
    }
    if (action === "reset-order") {
      await createNewDraftOrder(app);
      app.render();
      return;
    }
  }

  function orderToDraft(order) {
    const items = {};
    (order.items || []).forEach((item) => {
      items[item.id] = item.quantity;
    });
    return {
      orderType: order.orderType || "delivery",
      source: order.source || "",
      editingOrderId: "",
      status: order.status || "",
      customerName: stripCustomerNamePrefix(order.customerName, null, order.source || ""),
      phone: order.phone || "",
      address: order.address || "",
      branch: order.branch || "",
      items,
      paymentMethod: order.paymentMethod || "Tiền mặt",
      receiveTime: order.receiveTime || "",
      note: order.note || ""
    };
  }

  window.DMGOrder = {
    bindOrder,
    createNewDraftOrder,
    createSavedOrder,
    ensureActiveOrder,
    generateCustomerCheckText,
    formatShortPrice,
    getCustomerDisplayName,
    getCustomerRawName,
    getCustomerSourcePrefix,
    generateOrderText,
    getCartLines,
    getActiveOrder,
    getDisplayItemName,
    getDraftSource,
    getEmptyDraftForState,
    getItemSummary,
    getItemMessageName,
    getSavedItemName,
    getNextOrderCode,
    getOrderCode,
    getOrderTypeLabel,
    getStaff,
    getTotals,
    handleOrderAction,
    markOrderDeleted,
    normalizeOrderCodes,
    openSavedOrder,
    orderToDraft,
    renderOrder,
    restoreDeletedOrder,
    saveCurrentDraftOrder,
    updateSavedOrderFromDraft,
    validateBeforeFinalAction
  };
})();
