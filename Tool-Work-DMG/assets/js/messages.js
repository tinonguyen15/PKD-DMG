(function () {
  const U = window.DMGUtils;

  function applyTemplateVariables(template, state) {
    const draft = state.draftOrder;
    const totals = window.DMGOrder.getTotals(state);
    const values = {
      ten_khach: window.DMGOrder.getCustomerDisplayName
        ? window.DMGOrder.getCustomerDisplayName(state)
        : draft.customerName,
      so_dien_thoai: draft.phone,
      dia_chi: draft.address,
      chi_nhanh: draft.branch,
      tong_tien: U.formatMoney(totals.total),
      thoi_gian: draft.receiveTime,
      danh_sach_mon: window.DMGOrder.getItemSummary(state),
      hinh_thuc_thanh_toan: draft.paymentMethod
    };
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = values[String(key).trim()];
      return value ? value : match;
    });
  }

  function injectedSendMessageToChat(text) {
    const messageText = String(text || "");
    if (!messageText.trim()) return { ok: false, error: "Tin nhắn trống." };

    const normalizeText = (value) => String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const includesAny = (source, words) => words.some((word) => source.includes(normalizeText(word)));
    const visible = (el) => {
      if (!el || !el.getBoundingClientRect) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const disabled = (el) => el.disabled || el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled");
    const unique = (items) => [...new Set(items.filter(Boolean))];
    const getLabel = (el) => normalizeText([
      el.getAttribute("aria-label"),
      el.getAttribute("placeholder"),
      el.getAttribute("title"),
      el.getAttribute("data-testid"),
      el.textContent && el.textContent.length < 90 ? el.textContent : ""
    ].join(" "));
    const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
    const textToLineBreakHtml = (value) => String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line ? escapeHtml(line) : "<br>")
      .join("<br>");

    function notifyInput(el) {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function setNativeValue(el, value) {
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      if (descriptor?.set) descriptor.set.call(el, value);
      else el.value = value;
      notifyInput(el);
    }

    function insertTextKeepingLineBreaks(value) {
      const lines = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
      let inserted = true;
      lines.forEach((line, index) => {
        if (line) inserted = document.execCommand("insertText", false, line) && inserted;
        if (index < lines.length - 1) {
          const lineBreakInserted = document.execCommand("insertLineBreak", false);
          if (!lineBreakInserted) inserted = document.execCommand("insertHTML", false, "<br>") && inserted;
        }
      });
      return inserted;
    }

    function pasteTextToEditor(editor, value) {
      try {
        const clipboardData = new DataTransfer();
        clipboardData.setData("text/plain", value);
        clipboardData.setData("text/html", textToLineBreakHtml(value));
        const event = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData
        });
        return !editor.dispatchEvent(event);
      } catch (error) {
        return false;
      }
    }

    function writeToEditor(editor, value) {
      const normalizedValue = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      editor.scrollIntoView({ block: "center", inline: "nearest" });
      editor.focus({ preventScroll: true });
      if (editor.matches("textarea,input")) {
        setNativeValue(editor, normalizedValue);
        return;
      }

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);

      let inserted = false;
      try {
        document.execCommand("delete", false);
        inserted = pasteTextToEditor(editor, normalizedValue);
        if (!inserted) inserted = insertTextKeepingLineBreaks(normalizedValue);
      } catch (error) {
        inserted = false;
      }

      const currentText = editor.innerText || editor.textContent || "";
      if (!inserted && !currentText.includes(normalizedValue.slice(0, Math.min(normalizedValue.length, 20)))) {
        editor.innerHTML = textToLineBreakHtml(normalizedValue);
      }
      notifyInput(editor);
    }

    function findEditor() {
      const editorSelectors = [
        '[data-lexical-editor="true"][contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][aria-label]',
        'textarea:not([readonly])',
        'input[type="text"]:not([readonly])'
      ];
      const goodWords = ["tin nhan", "message", "messenger", "tra loi", "reply", "binh luan", "comment"];
      const badWords = ["tim kiem", "search", "filter", "loc", "ten", "phone", "so dien thoai"];
      const candidates = unique(editorSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))))
        .filter((el) => visible(el) && !disabled(el))
        .map((el) => {
          const label = getLabel(el);
          const rect = el.getBoundingClientRect();
          let score = 0;
          if (document.activeElement === el || el.contains(document.activeElement)) score += 1000;
          if (includesAny(label, goodWords)) score += 420;
          if (includesAny(label, badWords)) score -= 900;
          if (el.isContentEditable) score += 120;
          if (el.tagName === "TEXTAREA") score += 80;
          score += (rect.top / Math.max(window.innerHeight, 1)) * 140;
          score += Math.min(rect.width, 640) / 30;
          return { el, score };
        })
        .filter((item) => item.score > -300)
        .sort((a, b) => b.score - a.score);

      return candidates[0]?.el || null;
    }

    function findSendButton(editor) {
      const editorRect = editor.getBoundingClientRect();
      const sendWords = ["gui", "send", "press enter to send", "nhan enter de gui", "binh luan", "comment", "tra loi"];
      const badWords = ["like", "thich", "luot thich", "sticker", "gif", "emoji", "dinh kem", "attach", "file", "photo", "image", "mic", "more", "khac"];
      const roots = [];
      let node = editor;
      for (let i = 0; node && i < 8; i += 1) {
        roots.push(node);
        node = node.parentElement;
      }
      roots.push(document.body);

      const candidates = unique(roots.flatMap((root) => Array.from(root.querySelectorAll('button,[role="button"],[aria-label][tabindex]'))))
        .filter((el) => visible(el) && !disabled(el))
        .map((el) => {
          const label = getLabel(el);
          const rect = el.getBoundingClientRect();
          const hasSendLabel = includesAny(label, sendWords);
          const isSubmit = el.matches('button[type="submit"],input[type="submit"]');
          if (!hasSendLabel && !isSubmit) return null;
          let score = hasSendLabel ? 600 : 120;
          if (includesAny(label, badWords)) score -= 900;
          score -= Math.abs(rect.top - editorRect.top);
          score -= Math.abs(rect.left - editorRect.right) / 8;
          if (rect.left >= editorRect.left) score += 60;
          return { el, score };
        })
        .filter(Boolean)
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      return candidates[0]?.el || null;
    }

    function clickElement(el) {
      const rect = el.getBoundingClientRect();
      const eventInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      };
      if (typeof el.click === "function") {
        el.click();
        return;
      }
      el.dispatchEvent(new MouseEvent("click", eventInit));
    }

    return new Promise((resolve) => {
      try {
        const editor = findEditor();
        if (!editor) {
          resolve({ ok: false, error: "Không tìm thấy ô chat đang mở." });
          return;
        }
        writeToEditor(editor, messageText);
        window.setTimeout(() => {
          const sendButton = findSendButton(editor);
          if (!sendButton) {
            resolve({ ok: false, typed: true, error: "Đã nhập tin nhắn nhưng chưa tìm thấy nút gửi trên trang." });
            return;
          }
          clickElement(sendButton);
          resolve({ ok: true });
        }, 280);
      } catch (error) {
        resolve({ ok: false, error: error.message || "Không gửi được tin nhắn." });
      }
    });
  }

  function getActiveTab() {
    return new Promise((resolve, reject) => {
      if (!window.chrome?.tabs) {
        reject(new Error("Không dùng được Chrome Tabs API."));
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(tabs?.[0] || null);
      });
    });
  }

  function executeSendScript(tabId, text) {
    return new Promise((resolve, reject) => {
      if (!window.chrome?.scripting) {
        reject(new Error("Extension chưa có quyền scripting."));
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: injectedSendMessageToChat,
        args: [text]
      }, (results) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(results || []);
      });
    });
  }

  function getSendErrorMessage(error) {
    const message = String(error?.message || "");
    if (/permission|host permission|cannot access|scripting/i.test(message)) {
      return "Chưa có quyền gửi vào trang chat. Hãy tải lại extension rồi mở lại Facebook/Messenger.";
    }
    return message || "Không gửi được tin nhắn.";
  }

  async function sendMessageToActiveChat(text) {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error("Không tìm thấy tab chat đang mở.");
    const results = await executeSendScript(tab.id, text);
    const success = results.find((entry) => entry.result?.ok);
    if (success) return success.result;
    const typed = results.find((entry) => entry.result?.typed);
    const failed = typed || results.find((entry) => entry.result?.error);
    throw new Error(failed?.result?.error || "Không tìm thấy ô chat trong tab hiện tại.");
  }

  function renderMessages(state) {
    const cats = U.sortByOrder(state.messageCategories);
    const activeCat = state.ui.messageCategoryId || cats[0]?.id || "";
    const query = U.normalize(state.ui.messageSearch);
    const messages = U.sortByOrder(state.messageTemplates)
      .filter((msg) => msg.categoryId === activeCat)
      .filter((msg) => !query || U.normalize(`${msg.title} ${msg.content} ${msg.keywords}`).includes(query))
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (a.sortOrder || 0) - (b.sortOrder || 0));

    return `
      <section class="page-head message-head">
        <div>
          <p class="eyebrow">Gửi nhanh</p>
          <h1>Tin nhắn mẫu</h1>
        </div>
        <button class="btn primary" data-action="add-message">Thêm tin</button>
      </section>
      <section class="message-layout">
        <aside class="category-pane">
          <div class="pane-head">
            <strong>Danh mục</strong>
            <button class="icon-btn" data-action="add-message-category" title="Thêm">+</button>
          </div>
          <div class="category-list">
            ${cats.map((cat) => `
              <button class="category-item ${activeCat === cat.id ? "active" : ""}" data-action="select-message-category" data-id="${U.escapeHtml(cat.id)}">
                <span>${U.escapeHtml(cat.name)}</span>
              </button>
            `).join("")}
          </div>
          <div class="category-actions">
            <button class="btn ghost compact" data-action="rename-message-category" data-id="${U.escapeHtml(activeCat)}">Đổi tên</button>
            <button class="btn ghost compact" data-action="move-message-category" data-id="${U.escapeHtml(activeCat)}" data-dir="-1">Lên</button>
            <button class="btn ghost compact" data-action="move-message-category" data-id="${U.escapeHtml(activeCat)}" data-dir="1">Xuống</button>
            <button class="btn danger compact" data-action="delete-message-category" data-id="${U.escapeHtml(activeCat)}">Xóa</button>
          </div>
        </aside>
        <main class="template-pane">
          <div class="template-toolbar">
            <input class="search" data-action="message-search" value="${U.escapeHtml(state.ui.messageSearch)}" placeholder="Tìm tin nhắn">
            <span>${messages.length} tin</span>
          </div>
          ${messages.map((msg) => `
            <article class="template-card">
              <div class="template-content">
                <div class="template-title-line">
                  <strong>${U.escapeHtml(msg.title)}</strong>
                  ${msg.isPinned ? `<span class="pin-badge">Ghim</span>` : ""}
                </div>
                <p>${U.escapeHtml(msg.content)}</p>
              </div>
              <div class="template-actions">
                <button class="btn primary" data-action="send-message" data-id="${U.escapeHtml(msg.id)}">Gửi</button>
                <button class="btn ghost compact" data-action="copy-message" data-id="${U.escapeHtml(msg.id)}">Copy</button>
                <button class="btn ghost compact" data-action="edit-message" data-id="${U.escapeHtml(msg.id)}">Sửa</button>
                <details class="more-actions">
                  <summary class="btn ghost compact">...</summary>
                  <div class="more-menu">
                    <button class="btn ghost compact" data-action="pin-message" data-id="${U.escapeHtml(msg.id)}">${msg.isPinned ? "Bỏ ghim" : "Ghim"}</button>
                    <button class="btn ghost compact" data-action="move-message" data-id="${U.escapeHtml(msg.id)}" data-dir="-1">Lên</button>
                    <button class="btn ghost compact" data-action="move-message" data-id="${U.escapeHtml(msg.id)}" data-dir="1">Xuống</button>
                    <button class="btn danger compact" data-action="delete-message" data-id="${U.escapeHtml(msg.id)}">Xóa</button>
                  </div>
                </details>
              </div>
            </article>
          `).join("") || `<p class="empty">Chưa có tin nhắn trong danh mục này.</p>`}
        </main>
      </section>
    `;
  }

  function messageFormHtml(state, message = {}) {
    const cats = U.sortByOrder(state.messageCategories).map((cat) => `
      <option value="${U.escapeHtml(cat.id)}" ${message.categoryId === cat.id ? "selected" : ""}>${U.escapeHtml(cat.name)}</option>
    `).join("");
    return `
      <form class="modal-form" data-modal-form>
        <label>Danh mục <select name="categoryId">${cats}</select></label>
        <label>Tiêu đề <input name="title" value="${U.escapeHtml(message.title || "")}"></label>
        <label>Nội dung <textarea name="content">${U.escapeHtml(message.content || "")}</textarea></label>
        <label>Từ khóa <input name="keywords" value="${U.escapeHtml(message.keywords || "")}"></label>
      </form>
    `;
  }

  async function openMessageForm(app, message = null) {
    const id = message?.id;
    const result = await U.modal({
      title: id ? "Sửa tin nhắn" : "Thêm tin nhắn",
      body: messageFormHtml(app.state, message || { categoryId: app.state.ui.messageCategoryId }),
      confirmText: "Lưu"
    });
    if (!result) return;
    const form = document.querySelector("[data-modal-form]");
  }

  async function promptMessageData(app, message = {}) {
    const root = document.getElementById("modal-root");
    return new Promise((resolve) => {
      root.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal" role="dialog" aria-modal="true">
            <h3>${message.id ? "Sửa tin nhắn" : "Thêm tin nhắn"}</h3>
            ${messageFormHtml(app.state, message)}
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
        const form = root.querySelector("[data-modal-form]");
        const data = Object.fromEntries(new FormData(form).entries());
        root.innerHTML = "";
        resolve(data);
      });
    });
  }

  async function promptText(title, label, value = "") {
    const root = document.getElementById("modal-root");
    return new Promise((resolve) => {
      root.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal">
            <h3>${U.escapeHtml(title)}</h3>
            <form class="modal-form">
              <label>${U.escapeHtml(label)} <input data-input value="${U.escapeHtml(value)}"></label>
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
        resolve("");
      });
      root.querySelector("[data-save]").addEventListener("click", () => {
        const text = root.querySelector("[data-input]").value.trim();
        root.innerHTML = "";
        resolve(text);
      });
    });
  }

  async function handleMessagesAction(action, target, app) {
    if (action === "select-message-category") {
      app.state.ui.messageCategoryId = target.dataset.id;
      app.render();
      return;
    }
    if (action === "message-search") {
      app.state.ui.messageSearch = target.value;
      app.render();
      return;
    }
    if (action === "add-message-category") {
      const name = await promptText("Thêm danh mục", "Tên danh mục");
      if (!name) return;
      app.state.messageCategories.push({
        id: U.uid("msg-cat"),
        name,
        sortOrder: app.state.messageCategories.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await window.DMGStorage.setValue("messageCategories", app.state.messageCategories);
      app.render();
      U.toast("Đã thêm danh mục");
      return;
    }
    if (action === "rename-message-category") {
      const cat = app.state.messageCategories.find((item) => item.id === target.dataset.id);
      if (!cat) return;
      const name = await promptText("Đổi tên danh mục", "Tên danh mục", cat.name);
      if (!name) return;
      cat.name = name;
      cat.updatedAt = new Date().toISOString();
      await window.DMGStorage.setValue("messageCategories", app.state.messageCategories);
      app.render();
      return;
    }
    if (action === "move-message-category") {
      app.state.messageCategories = U.moveByIndex(app.state.messageCategories, target.dataset.id, Number(target.dataset.dir));
      await window.DMGStorage.setValue("messageCategories", app.state.messageCategories);
      app.render();
      return;
    }
    if (action === "delete-message-category") {
      const id = target.dataset.id;
      const used = app.state.messageTemplates.some((msg) => msg.categoryId === id);
      if (used) {
        const otherCats = app.state.messageCategories.filter((cat) => cat.id !== id);
        const options = otherCats.map((cat) => `<option value="${U.escapeHtml(cat.id)}">${U.escapeHtml(cat.name)}</option>`).join("");
        const choice = await U.modal({
          title: "Xóa danh mục?",
          body: "Danh mục này đang có tin nhắn. Chọn nơi chuyển tin hoặc xóa toàn bộ tin trong danh mục.",
          confirmText: "Tiếp tục",
          danger: true,
          extra: `<select data-modal-value><option value="__delete__">Xóa toàn bộ tin nhắn</option>${options}</select>`
        });
        if (!choice) return;
        if (choice === "__delete__") app.state.messageTemplates = app.state.messageTemplates.filter((msg) => msg.categoryId !== id);
        else app.state.messageTemplates = app.state.messageTemplates.map((msg) => msg.categoryId === id ? { ...msg, categoryId: choice } : msg);
      }
      app.state.messageCategories = app.state.messageCategories.filter((cat) => cat.id !== id);
      app.state.ui.messageCategoryId = app.state.messageCategories[0]?.id || "";
      await window.DMGStorage.setMany({ messageCategories: app.state.messageCategories, messageTemplates: app.state.messageTemplates });
      app.render();
      U.toast("Đã xóa danh mục");
      return;
    }
    if (action === "add-message" || action === "edit-message") {
      const current = action === "edit-message" ? app.state.messageTemplates.find((msg) => msg.id === target.dataset.id) : { categoryId: app.state.ui.messageCategoryId };
      const data = await promptMessageData(app, current || {});
      if (!data || !data.title.trim() || !data.content.trim()) return;
      if (current?.id) {
        app.state.messageTemplates = app.state.messageTemplates.map((msg) => msg.id === current.id ? { ...msg, ...data, updatedAt: new Date().toISOString() } : msg);
      } else {
        app.state.messageTemplates.push({
          id: U.uid("msg"),
          ...data,
          isPinned: false,
          sortOrder: app.state.messageTemplates.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      await window.DMGStorage.setValue("messageTemplates", app.state.messageTemplates);
      app.render();
      U.toast("Đã lưu tin nhắn");
      return;
    }
    const msg = app.state.messageTemplates.find((item) => item.id === target.dataset.id);
    if (!msg) return;
    if (action === "send-message") {
      if (target.disabled) return;
      const text = applyTemplateVariables(msg.content, app.state);
      if (!text.trim()) return U.toast("Tin nhắn trống.", "error");
      const originalText = target.textContent;
      target.disabled = true;
      target.textContent = "Đang gửi";
      try {
        await sendMessageToActiveChat(text);
        U.toast("Đã gửi tin nhắn");
      } catch (error) {
        U.toast(getSendErrorMessage(error), "error");
      } finally {
        target.disabled = false;
        target.textContent = originalText;
      }
      return;
    }
    if (action === "copy-message") {
      await U.copyText(applyTemplateVariables(msg.content, app.state));
      U.toast("Đã sao chép tin nhắn");
      return;
    }
    if (action === "pin-message") {
      msg.isPinned = !msg.isPinned;
      msg.updatedAt = new Date().toISOString();
      await window.DMGStorage.setValue("messageTemplates", app.state.messageTemplates);
      app.render();
      return;
    }
    if (action === "move-message") {
      const sameCat = app.state.messageTemplates.filter((item) => item.categoryId === msg.categoryId);
      const moved = U.moveByIndex(sameCat, msg.id, Number(target.dataset.dir));
      app.state.messageTemplates = app.state.messageTemplates.map((item) => moved.find((m) => m.id === item.id) || item);
      await window.DMGStorage.setValue("messageTemplates", app.state.messageTemplates);
      app.render();
      return;
    }
    if (action === "delete-message") {
      const ok = await U.modal({ title: "Xóa tin nhắn?", body: "Tin nhắn mẫu này sẽ bị xóa.", confirmText: "Xóa", danger: true });
      if (!ok) return;
      app.state.messageTemplates = app.state.messageTemplates.filter((item) => item.id !== msg.id);
      await window.DMGStorage.setValue("messageTemplates", app.state.messageTemplates);
      app.render();
      U.toast("Đã xóa tin nhắn");
    }
  }

  window.DMGMessages = {
    applyTemplateVariables,
    getSendErrorMessage,
    handleMessagesAction,
    renderMessages,
    sendMessageToActiveChat
  };
})();
