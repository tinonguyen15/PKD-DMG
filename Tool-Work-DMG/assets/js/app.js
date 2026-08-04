(function () {
  const U = window.DMGUtils;

  const tabs = [
    ["order", "Tạo đơn"],
    ["orders", "Đơn hàng"],
    ["reports", "Báo cáo"],
    ["messages", "Tin nhắn"],
    ["settings", "Cài đặt"]
  ];

  const app = {
    state: null,
    root: document.getElementById("app"),
    defaultUiState() {
      return {
        tab: "order",
        orderSearch: "",
        orderCategory: "all",
        previewOpen: false,
        ordersSearch: "",
        ordersDate: U.todayKey(),
        ordersStaff: "",
        ordersType: "",
        ordersSource: "",
        ordersStage: "",
        reportSearch: "",
        reportDate: U.todayKey(),
        reportStaff: "",
        reportType: "",
        reportSource: "",
        reportStage: "",
        messageCategoryId: "",
        messageSearch: "",
        settingsPanel: "staff"
      };
    },
    async createState() {
      const data = await window.DMGStorage.initialize();
      const ui = this.defaultUiState();
      ui.messageCategoryId = data.messageCategories[0]?.id || "";
      const state = { ...data, ui };
      if (window.DMGOrder?.ensureActiveOrder) await window.DMGOrder.ensureActiveOrder(state);
      return state;
    },
    render() {
      const tab = this.state.ui.tab;
      this.root.innerHTML = `
        <header class="app-header">
          <div class="brand">
            <div class="brand-mark">DMG</div>
            <div>
              <strong>Order & KPI</strong>
              <span>Lẩu Khổ Qua Rừng</span>
            </div>
          </div>
          <nav class="tabs">
            ${tabs.map(([id, label]) => `<button class="${tab === id ? "active" : ""}" data-action="tab" data-tab="${id}">${label}</button>`).join("")}
          </nav>
        </header>
        <main class="app-main ${tab === "order" ? "order-main" : ""}">
          ${this.renderTab(tab)}
        </main>
      `;
      if (tab === "order") window.DMGOrder.bindOrder(this.root, this);
    },
    renderTab(tab) {
      if (tab === "order") return window.DMGOrder.renderOrder(this.state);
      if (tab === "orders") return window.DMGOrders.renderOrders(this.state);
      if (tab === "reports") return window.DMGReports.renderReports(this.state);
      if (tab === "messages") return window.DMGMessages.renderMessages(this.state);
      return window.DMGSettings.renderSettings(this.state);
    },
    async dispatch(action, target, event) {
      if (!action) return;
      if (action === "tab") {
        this.state.ui.tab = target.dataset.tab;
        if (this.state.ui.tab === "order" && window.DMGOrder?.ensureActiveOrder) {
          await window.DMGOrder.ensureActiveOrder(this.state);
        }
        this.render();
        return;
      }
      if (this.state.ui.tab === "order") await window.DMGOrder.handleOrderAction(action, target, this, event);
      else if (this.state.ui.tab === "orders") await window.DMGOrders.handleOrdersAction(action, target, this, event);
      else if (this.state.ui.tab === "reports") await window.DMGReports.handleReportsAction(action, target, this, event);
      else if (this.state.ui.tab === "messages") await window.DMGMessages.handleMessagesAction(action, target, this, event);
      else if (this.state.ui.tab === "settings") await window.DMGSettings.handleSettingsAction(action, target, this, event);
    },
    async start() {
      try {
        this.state = await this.createState();
        this.render();
        this.root.addEventListener("click", async (event) => {
          const target = event.target.closest("[data-action]");
          if (!target || !this.root.contains(target)) return;
          if (target.matches("input, select, textarea")) return;
          event.preventDefault();
          await this.dispatch(target.dataset.action, target, event);
        });
        this.root.addEventListener("input", async (event) => {
          const target = event.target.closest("[data-action]");
          if (!target || !this.root.contains(target)) return;
          await this.dispatch(target.dataset.action, target, event);
        });
        this.root.addEventListener("change", async (event) => {
          const target = event.target.closest("[data-action]");
          if (!target || !this.root.contains(target)) return;
          await this.dispatch(target.dataset.action, target, event);
        });
      } catch (error) {
        this.root.innerHTML = `<section class="fatal"><h1>Không mở được extension</h1><p>${U.escapeHtml(error.message)}</p></section>`;
      }
    }
  };

  window.DMGApp = app;
  app.start();
})();
