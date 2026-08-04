(function () {
  const formatMoney = (value) => `${Math.max(0, Number(value) || 0).toLocaleString("vi-VN")}đ`;
  const parseMoney = (value) => {
    if (typeof value === "number") return Math.max(0, Math.round(value));
    return Math.max(0, Number(String(value || "").replace(/[^\d]/g, "")) || 0);
  };
  const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));

  const sortByOrder = (items) => [...(items || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const toast = (message, type = "ok") => {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.classList.add("show"), 20);
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 180);
    }, 2200);
  };

  const modal = ({ title, body, confirmText = "Đồng ý", cancelText = "Hủy", danger = false, extra = "" }) => new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    root.innerHTML = `
      <div class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true">
          <h3>${escapeHtml(title)}</h3>
          <div class="modal-body">${body}</div>
          ${extra}
          <div class="modal-actions">
            <button class="btn ghost" data-modal-cancel>${escapeHtml(cancelText)}</button>
            <button class="btn ${danger ? "danger" : "primary"}" data-modal-confirm>${escapeHtml(confirmText)}</button>
          </div>
        </section>
      </div>
    `;
    root.querySelector("[data-modal-cancel]").addEventListener("click", () => {
      root.innerHTML = "";
      resolve(false);
    });
    root.querySelector("[data-modal-confirm]").addEventListener("click", () => {
      const select = root.querySelector("[data-modal-value]");
      const value = select ? select.value : true;
      root.innerHTML = "";
      resolve(value);
    });
  });

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  const downloadJson = (filename, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const readJsonFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (error) {
        reject(new Error("File JSON không hợp lệ."));
      }
    };
    reader.onerror = () => reject(new Error("Không đọc được file."));
    reader.readAsText(file);
  });

  const moveByIndex = (items, id, direction) => {
    const list = sortByOrder(items);
    const index = list.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return items;
    const [item] = list.splice(index, 1);
    list.splice(nextIndex, 0, item);
    return list.map((entry, idx) => ({ ...entry, sortOrder: idx + 1 }));
  };

  window.DMGUtils = {
    copyText,
    downloadJson,
    escapeHtml,
    formatMoney,
    modal,
    moveByIndex,
    normalize,
    parseMoney,
    readJsonFile,
    sortByOrder,
    todayKey,
    toast,
    uid
  };
})();
