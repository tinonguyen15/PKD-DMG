(function () {
  function cleanCustomerText(value) {
    return String(value || '')
      .replace(/^==\s*Tổng tiền món:\s*(.*?)\s*==$/gim, '=> Tổng: $1')
      .replace(/^\s*=>\s*Tổng:\s*/gim, '=> Tổng: ')
      .trimEnd();
  }

  function cleanCustomerCopyFields() {
    document.querySelectorAll('#customer-copy, [data-customer-copy], textarea.copy-box').forEach((field) => {
      if (!('value' in field)) return;
      const cleaned = cleanCustomerText(field.value);
      if (field.value !== cleaned) {
        field.value = cleaned;
      }
    });
  }

  function patchClipboard() {
    if (!navigator.clipboard || !navigator.clipboard.writeText || navigator.clipboard.__customerCopyCleanupPatched) {
      return;
    }

    const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = function (text) {
      return originalWriteText(cleanCustomerText(text));
    };
    navigator.clipboard.__customerCopyCleanupPatched = true;
  }

  function appVersion() {
    return document.querySelector('meta[name="app-version"]')?.content || 'dev';
  }

  function loadMenuCardRedesign() {
    if (!document.querySelector('[data-order-create]') || document.querySelector('[data-menu-card-redesign-css]')) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/assets/css/menu-card-redesign-v2.css?v=${encodeURIComponent(appVersion())}`;
    link.dataset.menuCardRedesignCss = '1';
    document.head.appendChild(link);
  }

  function loadMenuAlerts() {
    if (!document.querySelector('[data-order-create]') || document.querySelector('[data-menu-alerts-script]')) {
      return;
    }

    const script = document.createElement('script');
    script.src = `/assets/js/menu-alerts.js?v=${encodeURIComponent(appVersion())}`;
    script.defer = true;
    script.dataset.menuAlertsScript = '1';
    document.body.appendChild(script);
  }

  function queueClean() {
    window.requestAnimationFrame(cleanCustomerCopyFields);
  }

  patchClipboard();
  cleanCustomerCopyFields();
  loadMenuCardRedesign();
  loadMenuAlerts();
  document.addEventListener('DOMContentLoaded', () => {
    cleanCustomerCopyFields();
    loadMenuCardRedesign();
    loadMenuAlerts();
  });
  document.addEventListener('input', queueClean, true);
  document.addEventListener('change', queueClean, true);
  document.addEventListener('click', queueClean, true);
})();
