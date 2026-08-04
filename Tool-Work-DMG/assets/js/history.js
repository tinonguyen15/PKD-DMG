(function () {
  const U = window.DMGUtils;

  const stages = [
    { id: "processing", label: "Đang xử lí" },
    { id: "sent", label: "Đã gửi CN" },
    { id: "completed", label: "Đã hoàn thành" },
    { id: "deleted", label: "Đã xóa" }
  ];

  function getStage(order) {
    return order.workflowStatus || "processing";
  }

  function stageLabel(id) {
    return stages.find((stage) => stage.id === id)?.label || stages[0].label;
  }

  function getFilteredOrders(state) {
    const query = U.normalize(state.ui.ordersSearch);
    const date = state.ui.ordersDate || "";
    const staff = state.ui.ordersStaff || "";
    const type = state.ui.ordersType || "";
    const source = state.ui.ordersSource || "";
    const stage = state.ui.ordersStage || "";
    return state.orderHistory.filter((order) => {
      const byDate = !date || order.createdDate === date || String(order.createdAt || "").startsWith(date);
      const text = [
        order.customerName,
        window.DMGOrder.getOrderCode(order),
        order.phone,
        order.address,
        order.staffId,
        order.staffName,
        stageLabel(getStage(order)),
        (order.items || []).map((item) => `${item.name} ${item.branchName || ""} ${item.customerName || ""} ${item.shortName || ""}`).join(" ")
      ].join(" ");
      return byDate
        && (!staff || order.staffId === staff)
        && (!type || order.orderType === type)
        && (!source || order.source === source)
        && (!stage || getStage(order) === stage)
        && (!query || U.normalize(text).includes(query));
    });
  }

  function renderStageSummary(rows) {
    return `
      <section class="stage-summary">
        ${stages.map((stage) => {
          const count = rows.filter((order) => getStage(order) === stage.id).length;
          return `<article><span>${stage.label}</span><b>${count}</b></article>`;
        }).join("")}
      </section>
    `;
  }

  function renderOrderCard(state, order) {
    const stage = getStage(order);
    const isDeleted = stage === "deleted";
    const deletedInfo = isDeleted && order.deletedAt
      ? ` | Xóa ${new Date(order.deletedAt).toLocaleString("vi-VN")}`
      : "";
    const paymentOptions = U.sortByOrder(state.paymentMethods).map((method) => `
      <option value="${U.escapeHtml(method.name)}" ${order.paymentMethod === method.name ? "selected" : ""}>${U.escapeHtml(method.name)}</option>
    `).join("");
    const statusOptions = U.sortByOrder(state.orderStatuses).map((status) => `
      <option value="${U.escapeHtml(status.name)}" ${order.status === status.name ? "selected" : ""}>${U.escapeHtml(status.name)}</option>
    `).join("");
    return `
      <article class="history-card order-card ${isDeleted ? "deleted" : ""}">
        <div>
          <strong>${U.escapeHtml(window.DMGOrder.getOrderCode(order))} - ${U.escapeHtml(order.customerName || "Không tên")} - ${U.formatMoney(order.total)}</strong>
          <span>${new Date(order.createdAt).toLocaleString("vi-VN")} | ${U.escapeHtml(order.staffId || "Không mã")} | ${U.escapeHtml(window.DMGOrder.getOrderTypeLabel(order.orderType))} | ${U.escapeHtml(order.source || "Chưa nguồn")} | ${U.escapeHtml(order.paymentMethod || "Chưa chọn")} | ${stageLabel(stage)}${order.status ? ` | ${U.escapeHtml(order.status)}` : ""}${U.escapeHtml(deletedInfo)}</span>
          <p>${U.escapeHtml((order.items || []).map((item) => `${item.quantity} ${window.DMGOrder.getSavedItemName(item, "branch")}`).join(", "))}</p>
        </div>
        ${isDeleted ? `
          <p class="deleted-note">Đơn đã xóa, có thể khôi phục để mở lại bên trang tạo đơn.</p>
        ` : `
          <div class="quick-order-controls">
            <label>Thanh toán
              <select data-action="quick-order-payment" data-id="${U.escapeHtml(order.id)}">
                <option value="">Chưa chọn</option>
                ${paymentOptions}
              </select>
            </label>
            <label>Trạng thái
              <select data-action="quick-order-status" data-id="${U.escapeHtml(order.id)}">
                <option value="">Không hiển thị</option>
                ${statusOptions}
              </select>
            </label>
          </div>
          <div class="stage-actions">
            ${stages.filter((item) => item.id !== "deleted").map((item) => `
              <button class="stage-chip ${stage === item.id ? "active" : ""}" data-action="set-order-stage" data-id="${U.escapeHtml(order.id)}" data-stage="${item.id}" ${stage === item.id ? "disabled" : ""}>${item.label}</button>
            `).join("")}
          </div>
        `}
        <div class="row-actions">
          ${isDeleted ? `
            <button class="btn primary" data-action="restore-order-history" data-id="${U.escapeHtml(order.id)}">Khôi phục</button>
          ` : `
            <button class="btn ghost" data-action="copy-order-history" data-id="${U.escapeHtml(order.id)}">Sao chép</button>
            <button class="btn ghost" data-action="edit-order-history" data-id="${U.escapeHtml(order.id)}">Mở sửa</button>
            <button class="btn danger" data-action="delete-order-history" data-id="${U.escapeHtml(order.id)}">Xóa</button>
          `}
        </div>
      </article>
    `;
  }

  function renderOrders(state) {
    const rows = getFilteredOrders(state);
    const staffOptions = U.sortByOrder(state.staffProfiles).map((item) => `
      <option value="${U.escapeHtml(item.id)}" ${state.ui.ordersStaff === item.id ? "selected" : ""}>${U.escapeHtml(item.id)} - ${U.escapeHtml(item.name)}</option>
    `).join("");
    const stageOptions = stages.map((item) => `
      <option value="${item.id}" ${state.ui.ordersStage === item.id ? "selected" : ""}>${item.label}</option>
    `).join("");
    const sourceOptions = U.sortByOrder(state.orderSources).map((item) => `
      <option value="${U.escapeHtml(item.name)}" ${state.ui.ordersSource === item.name ? "selected" : ""}>${U.escapeHtml(item.name)}</option>
    `).join("");
    return `
      <section class="page-head">
        <div>
          <p class="eyebrow">Theo dõi tiến độ</p>
          <h1>Đơn hàng</h1>
        </div>
        <input class="search" data-action="orders-search" value="${U.escapeHtml(state.ui.ordersSearch)}" placeholder="Tìm mã đơn, tên, SĐT, món, mã NV">
      </section>
      <section class="filter-grid">
        <label>Ngày <input type="date" data-action="orders-filter" data-key="ordersDate" value="${U.escapeHtml(state.ui.ordersDate || U.todayKey())}"></label>
        <label>Nhân viên
          <select data-action="orders-filter" data-key="ordersStaff">
            <option value="">Tất cả</option>
            ${staffOptions}
          </select>
        </label>
        <label>Loại đơn
          <select data-action="orders-filter" data-key="ordersType">
            <option value="">Tất cả</option>
            <option value="delivery" ${state.ui.ordersType === "delivery" ? "selected" : ""}>Mang về</option>
            <option value="pickup" ${state.ui.ordersType === "pickup" ? "selected" : ""}>Khách ghé lấy</option>
            <option value="booking" ${state.ui.ordersType === "booking" ? "selected" : ""}>Đặt bàn</option>
          </select>
        </label>
        <label>Nguồn đơn
          <select data-action="orders-filter" data-key="ordersSource">
            <option value="">Tất cả</option>
            ${sourceOptions}
          </select>
        </label>
        <label>Tình trạng
          <select data-action="orders-filter" data-key="ordersStage">
            <option value="">Tất cả</option>
            ${stageOptions}
          </select>
        </label>
      </section>
      ${renderStageSummary(rows)}
      <section class="orders-board">
        ${stages.map((stage) => {
          const stageRows = rows.filter((order) => getStage(order) === stage.id);
          const stageTotal = stageRows.reduce((sum, order) => sum + (order.total || 0), 0);
          return `
            <section class="order-column">
              <header>
                <strong>${stage.label}</strong>
                <span>${stageRows.length} đơn | ${U.formatMoney(stageTotal)}</span>
              </header>
              <div class="history-list">
                ${stageRows.map((order) => renderOrderCard(state, order)).join("") || `<p class="empty">Không có đơn.</p>`}
              </div>
            </section>
          `;
        }).join("")}
      </section>
    `;
  }

  async function saveHistory(app) {
    await window.DMGStorage.setValue("orderHistory", app.state.orderHistory);
  }

  function regenerateOrder(app, order) {
    const draft = window.DMGOrder.orderToDraft(order);
    return window.DMGOrder.updateSavedOrderFromDraft(app.state, order, draft);
  }

  async function handleOrdersAction(action, target, app) {
    if (action === "orders-search") {
      app.state.ui.ordersSearch = target.value;
      app.render();
      return;
    }
    if (action === "orders-filter") {
      app.state.ui[target.dataset.key] = target.value;
      app.render();
      return;
    }
    const id = target.dataset.id;
    const order = app.state.orderHistory.find((item) => item.id === id);
    if (!order) return;
    if (action === "set-order-stage") {
      order.workflowStatus = target.dataset.stage;
      order.updatedAt = new Date().toISOString();
      await saveHistory(app);
      app.render();
      U.toast(`Đã chuyển sang ${stageLabel(order.workflowStatus)}`);
      return;
    }
    if (action === "quick-order-payment") {
      order.paymentMethod = target.value;
      const updated = regenerateOrder(app, order);
      app.state.orderHistory = app.state.orderHistory.map((item) => item.id === order.id ? updated : item);
      await saveHistory(app);
      app.render();
      U.toast("Đã đổi hình thức thanh toán");
      return;
    }
    if (action === "quick-order-status") {
      order.status = target.value;
      const updated = regenerateOrder(app, order);
      app.state.orderHistory = app.state.orderHistory.map((item) => item.id === order.id ? updated : item);
      await saveHistory(app);
      app.render();
      U.toast("Đã đổi trạng thái đơn");
      return;
    }
    if (action === "delete-order-history") {
      const ok = await U.modal({
        title: `Xóa ${window.DMGOrder.getOrderCode(order)}?`,
        body: "Đơn sẽ nằm trong cột Đã xóa và có thể khôi phục lại.",
        confirmText: "Xóa đơn",
        danger: true
      });
      if (!ok) return;
      window.DMGOrder.markOrderDeleted(order);
      await saveHistory(app);
      app.render();
      U.toast(`Đã xóa ${window.DMGOrder.getOrderCode(order)}`);
      return;
    }
    if (action === "restore-order-history") {
      window.DMGOrder.restoreDeletedOrder(order);
      await saveHistory(app);
      await window.DMGOrder.openSavedOrder(app, order.id);
      app.state.ui.tab = "order";
      app.render();
      U.toast(`Đã khôi phục ${window.DMGOrder.getOrderCode(order)}`);
      return;
    }
    if (action === "copy-order-history") {
      await U.copyText(order.generatedText || "");
      if (getStage(order) === "processing") {
        order.workflowStatus = "sent";
        order.updatedAt = new Date().toISOString();
        await saveHistory(app);
        app.render();
        U.toast("Đã sao chép và chuyển sang Đã gửi CN");
      } else {
        U.toast("Đã sao chép đơn");
      }
      return;
    }
    if (action === "edit-order-history") {
      await window.DMGOrder.openSavedOrder(app, order.id);
      app.state.ui.tab = "order";
      app.render();
      U.toast(`Đã mở ${window.DMGOrder.getOrderCode(order)}`);
    }
  }

  window.DMGOrders = { handleOrdersAction, renderOrders };
})();
