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

  function queueClean() {
    window.requestAnimationFrame(cleanCustomerCopyFields);
  }

  patchClipboard();
  cleanCustomerCopyFields();
  document.addEventListener('DOMContentLoaded', cleanCustomerCopyFields);
  document.addEventListener('input', queueClean, true);
  document.addEventListener('change', queueClean, true);
  document.addEventListener('click', queueClean, true);
})();
