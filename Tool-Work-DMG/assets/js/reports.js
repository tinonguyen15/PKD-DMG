(function () {
  const U = window.DMGUtils;

  const stages = [
    { id: "processing", label: "Đang xử lí" },
    { id: "sent", label: "Đã gửi CN" },
    { id: "completed", label: "Đã hoàn thành" }
  ];

  function getStage(order) {
    return order.workflowStatus || "processing";
  }

  function hasReportableContent(order) {
    return Boolean(
      String(order.customerName || "").trim()
      || String(order.phone || "").trim()
      || String(order.address || "").trim()
      || (order.items || []).length
      || Number(order.total)
    );
  }

  function getRows(state) {
    const query = U.normalize(state.ui.reportSearch);
    const date = state.ui.reportDate || "";
    const staff = state.ui.reportStaff || "";
    const type = state.ui.reportType || "";
    const source = state.ui.reportSource || "";
    const stage = state.ui.reportStage || "";
    return state.orderHistory.filter((order) => {
      if (!hasReportableContent(order)) return false;
      if (getStage(order) === "deleted") return false;
      const byDate = !date || order.createdDate === date || String(order.createdAt || "").startsWith(date);
      const text = [
        order.customerName,
        window.DMGOrder.getOrderCode(order),
        order.phone,
        order.address,
        order.staffId,
        order.staffName,
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

  function renderMetrics(rows) {
    const total = rows.reduce((sum, order) => sum + (order.total || 0), 0);
    const average = rows.length ? Math.round(total / rows.length) : 0;
    return `
      <section class="metric-grid">
        <article><span>Số đơn</span><b>${rows.length}</b></article>
        <article><span>Tổng doanh thu</span><b>${U.formatMoney(total)}</b></article>
        <article><span>Trung bình đơn</span><b>${U.formatMoney(average)}</b></article>
      </section>
    `;
  }

  function renderReports(state) {
    const rows = getRows(state);
    const staffOptions = U.sortByOrder(state.staffProfiles).map((item) => `
      <option value="${U.escapeHtml(item.id)}" ${state.ui.reportStaff === item.id ? "selected" : ""}>${U.escapeHtml(item.id)} - ${U.escapeHtml(item.name)}</option>
    `).join("");
    const stageOptions = stages.map((item) => `
      <option value="${item.id}" ${state.ui.reportStage === item.id ? "selected" : ""}>${item.label}</option>
    `).join("");
    const sourceOptions = U.sortByOrder(state.orderSources).map((item) => `
      <option value="${U.escapeHtml(item.name)}" ${state.ui.reportSource === item.name ? "selected" : ""}>${U.escapeHtml(item.name)}</option>
    `).join("");

    return `
      <section class="page-head">
        <div>
          <p class="eyebrow">KPI & lịch sử</p>
          <h1>Báo cáo</h1>
        </div>
        <input class="search" data-action="report-search" value="${U.escapeHtml(state.ui.reportSearch)}" placeholder="Tìm mã đơn, tên, SĐT, món, mã NV">
      </section>
      <section class="filter-grid">
        <label>Ngày <input type="date" data-action="report-filter" data-key="reportDate" value="${U.escapeHtml(state.ui.reportDate || U.todayKey())}"></label>
        <label>Nhân viên
          <select data-action="report-filter" data-key="reportStaff">
            <option value="">Tất cả</option>
            ${staffOptions}
          </select>
        </label>
        <label>Loại đơn
          <select data-action="report-filter" data-key="reportType">
            <option value="">Tất cả</option>
            <option value="delivery" ${state.ui.reportType === "delivery" ? "selected" : ""}>Mang về</option>
            <option value="pickup" ${state.ui.reportType === "pickup" ? "selected" : ""}>Khách ghé lấy</option>
            <option value="booking" ${state.ui.reportType === "booking" ? "selected" : ""}>Đặt bàn</option>
          </select>
        </label>
        <label>Nguồn đơn
          <select data-action="report-filter" data-key="reportSource">
            <option value="">Tất cả</option>
            ${sourceOptions}
          </select>
        </label>
        <label>Tình trạng
          <select data-action="report-filter" data-key="reportStage">
            <option value="">Tất cả</option>
            ${stageOptions}
          </select>
        </label>
      </section>
      ${renderMetrics(rows)}
      <section class="history-list">
        ${rows.map((order) => `
          <article class="history-card">
            <div>
              <strong>${U.escapeHtml(window.DMGOrder.getOrderCode(order))} - ${U.escapeHtml(order.customerName || "Không tên")} - ${U.formatMoney(order.total)}</strong>
              <span>${new Date(order.createdAt).toLocaleString("vi-VN")} | ${U.escapeHtml(order.staffId || "Không mã")} | ${U.escapeHtml(window.DMGOrder.getOrderTypeLabel(order.orderType))} | ${U.escapeHtml(order.source || "Chưa nguồn")} | ${stages.find((stage) => stage.id === getStage(order))?.label || "Đang xử lí"}</span>
              <p>${U.escapeHtml((order.items || []).map((item) => `${item.quantity} ${window.DMGOrder.getSavedItemName(item, "branch")}`).join(", "))}</p>
            </div>
            <div class="row-actions">
              <button class="btn ghost" data-action="copy-report-order" data-id="${U.escapeHtml(order.id)}">Sao chép</button>
              <button class="btn ghost" data-action="edit-report-order" data-id="${U.escapeHtml(order.id)}">Mở lại</button>
              <button class="btn ghost" data-action="clone-report-order" data-id="${U.escapeHtml(order.id)}">Nhân bản</button>
              <button class="btn danger" data-action="delete-report-order" data-id="${U.escapeHtml(order.id)}">Xóa</button>
            </div>
          </article>
        `).join("") || `<p class="empty">Không có đơn trong bộ lọc này.</p>`}
      </section>
    `;
  }

  async function handleReportsAction(action, target, app) {
    if (action === "report-search") {
      app.state.ui.reportSearch = target.value;
      app.render();
      return;
    }
    if (action === "report-filter") {
      app.state.ui[target.dataset.key] = target.value;
      app.render();
      return;
    }
    const order = app.state.orderHistory.find((item) => item.id === target.dataset.id);
    if (!order) return;
    if (action === "copy-report-order") {
      await U.copyText(order.generatedText || "");
      U.toast("Đã sao chép đơn");
      return;
    }
    if (action === "edit-report-order" || action === "clone-report-order") {
      if (action === "edit-report-order") {
        await window.DMGOrder.openSavedOrder(app, order.id);
      } else {
        await window.DMGOrder.saveCurrentDraftOrder(app);
        app.state.draftOrder = window.DMGOrder.orderToDraft(order);
        app.state.draftOrder.editingOrderId = "";
        await window.DMGOrder.saveCurrentDraftOrder(app);
      }
      app.state.ui.tab = "order";
      app.render();
      U.toast(action === "edit-report-order" ? `Đã mở ${window.DMGOrder.getOrderCode(order)}` : "Đã nhân bản đơn mới");
      return;
    }
    if (action === "delete-report-order") {
      const ok = await U.modal({
        title: "Xóa đơn?",
        body: "Đơn sẽ chuyển sang mục Đã xóa trong tab Đơn hàng và có thể khôi phục lại.",
        confirmText: "Xóa",
        danger: true
      });
      if (!ok) return;
      window.DMGOrder.markOrderDeleted(order);
      await window.DMGStorage.setValue("orderHistory", app.state.orderHistory);
      app.render();
      U.toast("Đã xóa đơn");
    }
  }

  window.DMGReports = { handleReportsAction, renderReports };
})();
