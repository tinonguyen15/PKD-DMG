(function () {
  const U = window.DMGUtils;

  const panels = [
    ["staff", "Nhân viên"],
    ["branches", "Chi nhánh"],
    ["sources", "Nguồn đơn"],
    ["menu", "Món ăn"],
    ["statuses", "Trạng thái"],
    ["payments", "Thanh toán"],
    ["abbreviations", "Ghi tắt"],
    ["data", "Dữ liệu"]
  ];

  function renderSettings(state) {
    const panel = state.ui.settingsPanel || "staff";
    return `
      <section class="page-head">
        <div>
          <p class="eyebrow">Quản trị local</p>
          <h1>Cài đặt</h1>
        </div>
      </section>
      <div class="settings-shell">
        <aside class="settings-nav">
          ${panels.map(([id, name]) => `<button class="${panel === id ? "active" : ""}" data-action="settings-panel" data-id="${id}">${name}</button>`).join("")}
        </aside>
        <main class="settings-panel">
          ${renderPanel(state, panel)}
        </main>
      </div>
    `;
  }

  function renderPanel(state, panel) {
    if (panel === "staff") return renderStaffSettings(state);
    if (panel === "branches") return renderEditableList("branches", "Chi nhánh", state.branches, ["name", "address", "phone"]);
    if (panel === "sources") return renderSourcesSettings(state);
    if (panel === "statuses") return renderEditableList("statuses", "Trạng thái", state.orderStatuses, ["name"]);
    if (panel === "payments") return renderEditableList("payments", "Hình thức thanh toán", state.paymentMethods, ["name"]);
    if (panel === "menu") return renderMenuSettings(state);
    if (panel === "abbreviations") return renderAbbreviationSettings(state);
    return renderDataSettings(state);
  }

  function renderEditableList(kind, title, items, fields) {
    return `
      <div class="panel-title">
        <h2>${title}</h2>
        <button class="btn primary" data-action="add-${kind}">Thêm</button>
      </div>
      <div class="settings-list">
        ${U.sortByOrder(items).map((item) => `
          <article class="setting-row">
            <div>
              <strong>${U.escapeHtml(item.name || item.id)}</strong>
              <span>${fields.filter((field) => field !== "name").map((field) => item[field]).filter(Boolean).map(U.escapeHtml).join(" | ")}</span>
            </div>
            <div class="row-actions">
              <button class="btn ghost" data-action="edit-${kind}" data-id="${U.escapeHtml(item.id)}">Sửa</button>
              <button class="btn ghost" data-action="move-${kind}" data-id="${U.escapeHtml(item.id)}" data-dir="-1">Lên</button>
              <button class="btn ghost" data-action="move-${kind}" data-id="${U.escapeHtml(item.id)}" data-dir="1">Xuống</button>
              <button class="btn danger" data-action="delete-${kind}" data-id="${U.escapeHtml(item.id)}">Xóa</button>
            </div>
          </article>
        `).join("") || `<p class="empty">Chưa có dữ liệu.</p>`}
      </div>
    `;
  }

  function renderStaffSettings(state) {
    const options = U.sortByOrder(state.staffProfiles).map((staff) => `
      <option value="${U.escapeHtml(staff.id)}" ${state.currentStaffId === staff.id ? "selected" : ""}>
        ${U.escapeHtml(staff.id)} - ${U.escapeHtml(staff.name)}
      </option>
    `).join("");
    const current = state.staffProfiles.find((staff) => staff.id === state.currentStaffId);
    return `
      <section class="current-staff-box">
        <div>
          <h2>Nhân viên đang dùng</h2>
          <p class="muted">${current ? `${U.escapeHtml(current.id)} - ${U.escapeHtml(current.name)}` : "Chưa chọn nhân viên. Cần chọn trước khi sao chép hoặc lưu đơn."}</p>
        </div>
        <select data-action="select-current-staff">
          <option value="">Chưa chọn</option>
          ${options}
        </select>
      </section>
      ${renderEditableList("staff", "Danh sách nhân viên", state.staffProfiles, ["id", "name"])}
    `;
  }

  function renderMenuCategoryManager(state) {
    return `
      <div class="panel-title">
        <h2>Danh mục món</h2>
        <button class="btn primary" data-action="add-menu-category">Thêm danh mục</button>
      </div>
      <div class="settings-list">
        ${U.sortByOrder(state.menuCategories).map((category) => {
          const itemCount = state.menuItems.filter((item) => item.category === category.id).length;
          return `
            <article class="setting-row">
              <div>
                <strong>${U.escapeHtml(category.name)}</strong>
                <span>${itemCount} món</span>
              </div>
              <div class="row-actions">
                <button class="btn ghost" data-action="edit-menu-category" data-id="${U.escapeHtml(category.id)}">Sửa</button>
                <button class="btn ghost" data-action="move-menu-category" data-id="${U.escapeHtml(category.id)}" data-dir="-1">Lên</button>
                <button class="btn ghost" data-action="move-menu-category" data-id="${U.escapeHtml(category.id)}" data-dir="1">Xuống</button>
                <button class="btn danger" data-action="delete-menu-category" data-id="${U.escapeHtml(category.id)}">Xóa</button>
              </div>
            </article>
          `;
        }).join("") || `<p class="empty">Chưa có danh mục.</p>`}
      </div>
    `;
  }

  function renderMenuSettings(state) {
    const categories = U.sortByOrder(state.menuCategories);
    return `
      ${renderMenuCategoryManager(state)}
      <div class="panel-title">
        <h2>Món ăn</h2>
        <button class="btn primary" data-action="add-menu">Thêm món</button>
      </div>
      <div class="settings-list">
        ${U.sortByOrder(state.menuItems).map((item) => {
          const cat = categories.find((entry) => entry.id === item.category)?.name || item.category;
          return `
            <article class="setting-row">
              <div class="dish-thumb small-thumb">${item.imageData ? `<img src="${U.escapeHtml(item.imageData)}" alt="">` : `<span>${U.escapeHtml(item.imagePlaceholder || item.name.slice(0, 2))}</span>`}</div>
              <div>
                <strong>${U.escapeHtml(item.name)} ${item.active ? "" : "(ẩn)"}</strong>
                <span>${U.escapeHtml(cat)} | ${U.formatMoney(item.price)} | ${U.escapeHtml(item.unit)}</span>
                <span>CN: ${U.escapeHtml(item.branchName || item.shortName || item.name)} | KH: ${U.escapeHtml(item.customerName || item.name)}</span>
              </div>
              <div class="row-actions">
                <button class="btn ghost" data-action="edit-menu" data-id="${U.escapeHtml(item.id)}">Sửa</button>
                <button class="btn ghost" data-action="toggle-menu" data-id="${U.escapeHtml(item.id)}">${item.active ? "Ẩn" : "Hiện"}</button>
                <button class="btn ghost" data-action="move-menu" data-id="${U.escapeHtml(item.id)}" data-dir="-1">Lên</button>
                <button class="btn ghost" data-action="move-menu" data-id="${U.escapeHtml(item.id)}" data-dir="1">Xuống</button>
                <button class="btn danger" data-action="delete-menu" data-id="${U.escapeHtml(item.id)}">Xóa</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderSourcesSettings(state) {
    const defaultSource = state.settings.defaultOrderSource || "";
    return `
      <section class="current-staff-box">
        <div>
          <h2>Nguồn mặc định</h2>
          <p class="muted">${defaultSource ? U.escapeHtml(defaultSource) : "Chưa chọn nguồn mặc định."}</p>
        </div>
        <button class="btn ghost" data-action="clear-default-source">Bỏ mặc định</button>
      </section>
      <div class="panel-title">
        <h2>Nguồn đơn</h2>
        <button class="btn primary" data-action="add-sources">Thêm</button>
      </div>
      <div class="settings-list">
        ${U.sortByOrder(state.orderSources).map((item) => `
          <article class="setting-row">
            <div>
              <strong>${U.escapeHtml(item.name || item.id)} ${defaultSource === item.name ? "(mặc định)" : ""}</strong>
              <span>${item.active === false ? "Đang ẩn" : "Đang dùng"}</span>
            </div>
            <div class="row-actions">
              <button class="btn secondary" data-action="set-default-source" data-id="${U.escapeHtml(item.id)}" ${defaultSource === item.name ? "disabled" : ""}>Mặc định</button>
              <button class="btn ghost" data-action="edit-sources" data-id="${U.escapeHtml(item.id)}">Sửa</button>
              <button class="btn ghost" data-action="move-sources" data-id="${U.escapeHtml(item.id)}" data-dir="-1">Lên</button>
              <button class="btn ghost" data-action="move-sources" data-id="${U.escapeHtml(item.id)}" data-dir="1">Xuống</button>
              <button class="btn danger" data-action="delete-sources" data-id="${U.escapeHtml(item.id)}">Xóa</button>
            </div>
          </article>
        `).join("") || `<p class="empty">Chưa có nguồn đơn.</p>`}
      </div>
    `;
  }

  function renderAbbreviationSettings(state) {
    const rules = U.sortByOrder(state.settings.abbreviationRules || []);
    return `
      <div class="panel-title">
        <div>
          <h2>Quy tắc ghi tắt</h2>
          <p class="muted">Tên gửi chính chỉnh trong Món ăn. Mục này dùng để hiện giá dạng 529k hoặc hỗ trợ dữ liệu cũ.</p>
        </div>
        <button class="btn primary" data-action="add-abbreviation">Thêm quy tắc</button>
      </div>
      <div class="settings-list">
        ${rules.map((rule) => `
          <article class="setting-row">
            <div>
              <strong>${U.escapeHtml(rule.output || rule.match)} ${rule.active === false ? "(tắt)" : ""}</strong>
              <span>Khớp: ${U.escapeHtml(rule.match)} | ${rule.showPrice ? "Có hiện giá k" : "Không hiện giá"}</span>
            </div>
            <div class="row-actions">
              <button class="btn ghost" data-action="edit-abbreviation" data-id="${U.escapeHtml(rule.id)}">Sửa</button>
              <button class="btn ghost" data-action="toggle-abbreviation" data-id="${U.escapeHtml(rule.id)}">${rule.active === false ? "Bật" : "Tắt"}</button>
              <button class="btn ghost" data-action="move-abbreviation" data-id="${U.escapeHtml(rule.id)}" data-dir="-1">Lên</button>
              <button class="btn ghost" data-action="move-abbreviation" data-id="${U.escapeHtml(rule.id)}" data-dir="1">Xuống</button>
              <button class="btn danger" data-action="delete-abbreviation" data-id="${U.escapeHtml(rule.id)}">Xóa</button>
            </div>
          </article>
        `).join("") || `<p class="empty">Chưa có quy tắc ghi tắt.</p>`}
      </div>
    `;
  }

  function renderDataSettings(state) {
    return `
      <div class="panel-title">
        <h2>Sao lưu dữ liệu</h2>
      </div>
      <div class="data-actions">
        <button class="btn primary" data-action="export-json">Xuất JSON</button>
        <label class="file-btn">Nhập JSON <input type="file" accept="application/json" data-action="import-json"></label>
        <button class="btn danger" data-action="clear-history">Xóa lịch sử đơn</button>
        <button class="btn danger" data-action="reset-defaults">Khôi phục mặc định</button>
      </div>
      <p class="muted">Dữ liệu hiện có: ${state.orderHistory.length} đơn, ${state.staffProfiles.length} nhân viên, ${state.menuItems.length} món, ${state.orderSources.length} nguồn đơn.</p>
    `;
  }

  async function promptEntity(title, fields, entity = {}) {
    const root = document.getElementById("modal-root");
    return new Promise((resolve) => {
      root.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal">
            <h3>${U.escapeHtml(title)}</h3>
            <form class="modal-form" data-form>
              ${fields.map((field) => `<label>${field.label} ${field.type === "textarea" ? `<textarea name="${field.key}">${U.escapeHtml(entity[field.key] || "")}</textarea>` : `<input name="${field.key}" value="${U.escapeHtml(entity[field.key] ?? "")}">`}</label>`).join("")}
            </form>
            <div class="modal-actions">
              <button class="btn ghost" data-cancel>Hủy</button>
              <button class="btn primary" data-save>Lưu</button>
            </div>
          </section>
        </div>
      `;
      root.querySelector("[data-cancel]").addEventListener("click", () => {
        root.innerHTML = "";
        resolve(null);
      });
      root.querySelector("[data-save]").addEventListener("click", () => {
        const data = Object.fromEntries(new FormData(root.querySelector("[data-form]")).entries());
        root.innerHTML = "";
        resolve(data);
      });
    });
  }

  function readMenuImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Vui lòng chọn đúng file ảnh."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const maxSize = 640;
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Không xử lý được ảnh này."));
            return;
          }
          context.fillStyle = "#fff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.onerror = () => reject(new Error("Không đọc được ảnh này."));
        image.src = String(reader.result || "");
      };
      reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
      reader.readAsDataURL(file);
    });
  }

  async function promptMenu(state, item = {}) {
    const root = document.getElementById("modal-root");
    const cats = U.sortByOrder(state.menuCategories).map((cat) => `<option value="${U.escapeHtml(cat.id)}" ${item.category === cat.id ? "selected" : ""}>${U.escapeHtml(cat.name)}</option>`).join("");
    const branchName = item.branchName || item.shortName || item.name || "";
    const customerName = item.customerName || item.name || branchName;
    const getPreviewMarkup = (imageData, placeholder) => imageData
      ? `<img src="${U.escapeHtml(imageData)}" alt="">`
      : `<span>${U.escapeHtml(placeholder || item.imagePlaceholder || item.name?.slice(0, 2) || "Ảnh")}</span>`;
    return new Promise((resolve) => {
      let selectedImageData = "";
      root.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal">
            <h3>${item.id ? "Sửa món" : "Thêm món"}</h3>
            <form class="modal-form" data-form>
              <div class="menu-image-picker">
                <div class="dish-thumb preview-thumb" data-menu-image-preview>${getPreviewMarkup(item.imageData || "", item.imagePlaceholder)}</div>
                <div>
                  <label class="file-btn menu-image-upload">Chọn ảnh <input type="file" accept="image/*" data-menu-image-file></label>
                  ${item.imageData ? `<label class="check-row clear-image-row"><input type="checkbox" name="clearImage" value="1" data-clear-menu-image> Xóa ảnh hiện tại</label>` : ""}
                  <p class="muted">Ảnh sẽ tự nén nhỏ để lưu local.</p>
                </div>
              </div>
              <label>Tên món <input name="name" value="${U.escapeHtml(item.name || "")}"></label>
              <label>Tên khi sao chép <input name="branchName" value="${U.escapeHtml(branchName)}" placeholder="Ví dụ: Đọt (Nhỏ)"></label>
              <label>Tên khi gửi khách hàng <input name="customerName" value="${U.escapeHtml(customerName)}" placeholder="Ví dụ: Đọt Khổ Qua Rừng (Nhỏ)"></label>
              <label>Giá <input name="price" inputmode="numeric" value="${U.escapeHtml(item.price || "")}"></label>
              <label>Đơn vị <input name="unit" value="${U.escapeHtml(item.unit || "phần")}"></label>
              <label>Danh mục <select name="category">${cats}</select></label>
              <label>Placeholder ảnh <input name="imagePlaceholder" value="${U.escapeHtml(item.imagePlaceholder || "")}"></label>
            </form>
            <div class="modal-actions">
              <button class="btn ghost" data-cancel>Hủy</button>
              <button class="btn primary" data-save>Lưu</button>
            </div>
          </section>
        </div>
      `;
      const preview = root.querySelector("[data-menu-image-preview]");
      const imageInput = root.querySelector("[data-menu-image-file]");
      const clearInput = root.querySelector("[data-clear-menu-image]");
      const placeholderInput = root.querySelector("input[name='imagePlaceholder']");
      imageInput.addEventListener("change", async () => {
        const file = imageInput.files[0];
        if (!file) return;
        try {
          selectedImageData = await readMenuImageFile(file);
          if (clearInput) clearInput.checked = false;
          preview.innerHTML = getPreviewMarkup(selectedImageData, placeholderInput.value);
        } catch (error) {
          imageInput.value = "";
          U.toast(error.message, "error");
        }
      });
      placeholderInput.addEventListener("input", () => {
        if (!selectedImageData && (!item.imageData || clearInput?.checked)) {
          preview.innerHTML = getPreviewMarkup("", placeholderInput.value);
        }
      });
      clearInput?.addEventListener("change", () => {
        preview.innerHTML = clearInput.checked
          ? getPreviewMarkup("", placeholderInput.value)
          : getPreviewMarkup(selectedImageData || item.imageData || "", placeholderInput.value);
      });
      root.querySelector("[data-cancel]").addEventListener("click", () => {
        root.innerHTML = "";
        resolve(null);
      });
      root.querySelector("[data-save]").addEventListener("click", () => {
        const formData = Object.fromEntries(new FormData(root.querySelector("[data-form]")).entries());
        const imageData = formData.clearImage === "1" ? "" : (selectedImageData || item.imageData || "");
        root.innerHTML = "";
        resolve({
          name: String(formData.name || ""),
          branchName: String(formData.branchName || ""),
          customerName: String(formData.customerName || ""),
          price: String(formData.price || ""),
          unit: String(formData.unit || "phần"),
          category: String(formData.category || ""),
          imagePlaceholder: String(formData.imagePlaceholder || ""),
          imageData
        });
      });
    });
  }

  async function promptAbbreviation(rule = {}) {
    const root = document.getElementById("modal-root");
    return new Promise((resolve) => {
      root.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal">
            <h3>${rule.id ? "Sửa quy tắc ghi tắt" : "Thêm quy tắc ghi tắt"}</h3>
            <form class="modal-form" data-form>
              <label>Chữ cần khớp <input name="match" value="${U.escapeHtml(rule.match || "")}" placeholder="Ví dụ: Khổ qua rừng nhồi"></label>
              <label>Tên xuất ra khi thiếu tên gửi <input name="output" value="${U.escapeHtml(rule.output || "")}" placeholder="Ví dụ: Nhồi"></label>
              <label class="check-row"><input type="checkbox" name="showPrice" value="1" ${rule.showPrice ? "checked" : ""}> Hiện giá dạng 319k</label>
            </form>
            <div class="modal-actions">
              <button class="btn ghost" data-cancel>Hủy</button>
              <button class="btn primary" data-save>Lưu</button>
            </div>
          </section>
        </div>
      `;
      root.querySelector("[data-cancel]").addEventListener("click", () => {
        root.innerHTML = "";
        resolve(null);
      });
      root.querySelector("[data-save]").addEventListener("click", () => {
        const data = Object.fromEntries(new FormData(root.querySelector("[data-form]")).entries());
        root.innerHTML = "";
        resolve({
          match: String(data.match || "").trim(),
          output: String(data.output || "").trim(),
          showPrice: data.showPrice === "1"
        });
      });
    });
  }

  const listMap = {
    staff: ["staffProfiles", [
      { key: "id", label: "Mã nhân viên" },
      { key: "name", label: "Tên nhân viên" }
    ]],
    branches: ["branches", [
      { key: "name", label: "Tên chi nhánh" },
      { key: "address", label: "Địa chỉ" },
      { key: "phone", label: "SĐT" }
    ]],
    sources: ["orderSources", [{ key: "name", label: "Tên nguồn đơn" }]],
    statuses: ["orderStatuses", [{ key: "name", label: "Tên trạng thái" }]],
    payments: ["paymentMethods", [{ key: "name", label: "Tên hình thức" }]]
  };

  async function handleSettingsAction(action, target, app) {
    if (action === "settings-panel") {
      app.state.ui.settingsPanel = target.dataset.id;
      app.render();
      return;
    }
    if (action === "select-current-staff") {
      app.state.currentStaffId = target.value;
      await window.DMGStorage.setValue("currentStaffId", target.value);
      app.render();
      U.toast(target.value ? "Đã chọn nhân viên" : "Đã bỏ chọn nhân viên");
      return;
    }
    if (action === "set-default-source") {
      const source = app.state.orderSources.find((item) => item.id === target.dataset.id);
      if (!source) return;
      app.state.settings.defaultOrderSource = source.name;
      if (!app.state.draftOrder.source) app.state.draftOrder.source = source.name;
      await window.DMGStorage.setMany({ settings: app.state.settings, draftOrder: app.state.draftOrder });
      app.render();
      U.toast("Đã chọn nguồn mặc định");
      return;
    }
    if (action === "clear-default-source") {
      app.state.settings.defaultOrderSource = "";
      await window.DMGStorage.setValue("settings", app.state.settings);
      app.render();
      U.toast("Đã bỏ nguồn mặc định");
      return;
    }
    if (action === "export-json") {
      const data = await window.DMGStorage.getAll();
      U.downloadJson(`dmg-backup-${U.todayKey()}.json`, data);
      U.toast("Đã xuất JSON");
      return;
    }
    if (action === "import-json") {
      const file = target.files[0];
      if (!file) return;
      try {
        const data = await U.readJsonFile(file);
        await window.DMGStorage.importData(data);
        app.state = await app.createState();
        app.render();
        U.toast("Đã nhập dữ liệu");
      } catch (error) {
        U.toast(error.message, "error");
      }
      return;
    }
    if (action === "clear-history") {
      const ok = await U.modal({ title: "Xóa toàn bộ lịch sử?", body: "Tất cả đơn đã lưu trên máy này sẽ bị xóa.", confirmText: "Xóa", danger: true });
      if (!ok) return;
      app.state.orderHistory = [];
      await window.DMGStorage.setValue("orderHistory", []);
      app.render();
      return;
    }
    if (action === "reset-defaults") {
      const ok = await U.modal({ title: "Khôi phục mặc định?", body: "Toàn bộ dữ liệu local sẽ về mặc định, bao gồm lịch sử.", confirmText: "Khôi phục", danger: true });
      if (!ok) return;
      app.state = await window.DMGStorage.resetDefaults();
      app.state.ui = app.defaultUiState();
      app.render();
      return;
    }
    if (action.includes("-menu")) {
      await handleMenuAction(action, target, app);
      return;
    }
    if (action.includes("-abbreviation")) {
      await handleAbbreviationAction(action, target, app);
      return;
    }
    for (const kind of Object.keys(listMap)) {
      if (action.endsWith(`-${kind}`)) {
        await handleListAction(kind, action.replace(`-${kind}`, ""), target, app);
        return;
      }
    }
  }

  async function handleListAction(kind, verb, target, app) {
    const [key, fields] = listMap[kind];
    const list = app.state[key];
    if (verb === "add") {
      const data = await promptEntity("Thêm dữ liệu", fields);
      if (!data) return;
      const id = kind === "staff" ? data.id.trim() : U.uid(kind);
      if (!id || !data.name?.trim()) return U.toast("Nhập đủ thông tin bắt buộc.", "error");
      if (list.some((item) => item.id === id)) return U.toast("ID đã tồn tại.", "error");
      app.state[key] = [...list, { id, ...data, active: true, sortOrder: list.length + 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    }
    if (verb === "edit") {
      const entity = list.find((item) => item.id === target.dataset.id);
      if (!entity) return;
      const previousName = entity.name;
      const data = await promptEntity("Sửa dữ liệu", fields, entity);
      if (!data) return;
      app.state[key] = list.map((item) => item.id === entity.id ? { ...item, ...data, id: entity.id, updatedAt: new Date().toISOString() } : item);
      if (kind === "sources" && app.state.settings.defaultOrderSource === previousName) {
        app.state.settings.defaultOrderSource = data.name;
      }
    }
    if (verb === "move") {
      app.state[key] = U.moveByIndex(list, target.dataset.id, Number(target.dataset.dir));
    }
    if (verb === "delete") {
      const ok = await U.modal({ title: "Xóa dữ liệu?", body: "Mục này sẽ bị xóa khỏi cài đặt.", confirmText: "Xóa", danger: true });
      if (!ok) return;
      const entity = list.find((item) => item.id === target.dataset.id);
      app.state[key] = list.filter((item) => item.id !== target.dataset.id);
      if (kind === "staff" && app.state.currentStaffId === target.dataset.id) app.state.currentStaffId = "";
      if (kind === "sources" && entity && app.state.settings.defaultOrderSource === entity.name) {
        app.state.settings.defaultOrderSource = "";
      }
    }
    await window.DMGStorage.setMany({ [key]: app.state[key], currentStaffId: app.state.currentStaffId, settings: app.state.settings });
    app.render();
  }

  async function promptMenuCategory(category = {}) {
    const data = await promptEntity(category.id ? "Sửa danh mục món" : "Thêm danh mục món", [
      { key: "name", label: "Tên danh mục" }
    ], category);
    if (!data) return null;
    return { name: String(data.name || "").trim() };
  }

  async function handleMenuCategoryAction(action, target, app) {
    const id = target.dataset.id;
    const category = app.state.menuCategories.find((entry) => entry.id === id);
    if (action === "add-menu-category" || action === "edit-menu-category") {
      const data = await promptMenuCategory(category || {});
      if (!data) return;
      if (!data.name) return U.toast("Nhập tên danh mục.", "error");
      if (category) {
        app.state.menuCategories = app.state.menuCategories.map((entry) => entry.id === category.id
          ? { ...entry, name: data.name, updatedAt: new Date().toISOString() }
          : entry);
      } else {
        app.state.menuCategories = [...app.state.menuCategories, {
          id: U.uid("menu-cat"),
          name: data.name,
          active: true,
          sortOrder: app.state.menuCategories.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }];
      }
    }
    if (action === "move-menu-category") {
      app.state.menuCategories = U.moveByIndex(app.state.menuCategories, id, Number(target.dataset.dir));
    }
    if (action === "delete-menu-category" && category) {
      const used = app.state.menuItems.some((item) => item.category === category.id);
      if (used) return U.toast("Danh mục đang có món. Chuyển món sang danh mục khác trước.", "error");
      const ok = await U.modal({ title: "Xóa danh mục?", body: "Danh mục này sẽ bị xóa khỏi danh sách món.", confirmText: "Xóa", danger: true });
      if (!ok) return;
      app.state.menuCategories = app.state.menuCategories.filter((entry) => entry.id !== category.id);
    }
    await window.DMGStorage.setValue("menuCategories", app.state.menuCategories);
    app.render();
  }

  async function handleMenuAction(action, target, app) {
    if (action.endsWith("-menu-category")) {
      await handleMenuCategoryAction(action, target, app);
      return;
    }
    const id = target.dataset.id;
    const item = app.state.menuItems.find((entry) => entry.id === id);
    if (action === "add-menu" || action === "edit-menu") {
      const data = await promptMenu(app.state, item || {});
      if (!data || !data.name.trim()) return;
      if (!data.category) return U.toast("Chọn danh mục cho món.", "error");
      const branchName = String(data.branchName || data.name).trim();
      const customerName = String(data.customerName || data.name).trim();
      const next = {
        ...(item || {
          id: U.uid("dish"),
          active: true,
          sortOrder: app.state.menuItems.length + 1,
          imageData: ""
        }),
        ...data,
        branchName,
        customerName,
        shortName: branchName,
        price: U.parseMoney(data.price),
        updatedAt: new Date().toISOString()
      };
      app.state.menuItems = item
        ? app.state.menuItems.map((entry) => entry.id === item.id ? next : entry)
        : [...app.state.menuItems, next];
    }
    if (action === "toggle-menu" && item) {
      item.active = !item.active;
    }
    if (action === "move-menu") {
      app.state.menuItems = U.moveByIndex(app.state.menuItems, id, Number(target.dataset.dir));
    }
    if (action === "delete-menu" && item) {
      const ok = await U.modal({ title: "Xóa món?", body: "Món này sẽ không còn trong danh sách bán.", confirmText: "Xóa", danger: true });
      if (!ok) return;
      app.state.menuItems = app.state.menuItems.filter((entry) => entry.id !== id);
    }
    await window.DMGStorage.setValue("menuItems", app.state.menuItems);
    app.render();
  }

  async function handleAbbreviationAction(action, target, app) {
    const rules = app.state.settings.abbreviationRules || [];
    const id = target.dataset.id;
    const rule = rules.find((entry) => entry.id === id);
    if (action === "add-abbreviation" || action === "edit-abbreviation") {
      const data = await promptAbbreviation(rule || {});
      if (!data) return;
      if (!data.match || !data.output) return U.toast("Nhập đủ chữ cần khớp và tên xuất ra.", "error");
      const next = {
        ...(rule || {
          id: U.uid("abbr"),
          active: true,
          sortOrder: rules.length + 1
        }),
        ...data,
        updatedAt: new Date().toISOString()
      };
      app.state.settings.abbreviationRules = rule
        ? rules.map((entry) => entry.id === rule.id ? next : entry)
        : [...rules, next];
    }
    if (action === "toggle-abbreviation" && rule) {
      rule.active = rule.active === false;
    }
    if (action === "move-abbreviation") {
      app.state.settings.abbreviationRules = U.moveByIndex(rules, id, Number(target.dataset.dir));
    }
    if (action === "delete-abbreviation" && rule) {
      const ok = await U.modal({ title: "Xóa quy tắc?", body: "Quy tắc ghi tắt này sẽ bị xóa.", confirmText: "Xóa", danger: true });
      if (!ok) return;
      app.state.settings.abbreviationRules = rules.filter((entry) => entry.id !== id);
    }
    await window.DMGStorage.setValue("settings", app.state.settings);
    app.render();
  }

  window.DMGSettings = { handleSettingsAction, renderSettings };
})();
