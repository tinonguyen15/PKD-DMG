(function () {
  function cleanBranchCopyText(value) {
    return String(value || '')
      .split(/\r?\n/)
      .filter((line) => !/^\s*•\s*Thanh toán\s*:/i.test(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd();
  }

  function cleanPreview() {
    const preview = document.querySelector('[data-order-preview]');
    if (!preview) return;
    const cleaned = cleanBranchCopyText(preview.value);
    if (preview.value !== cleaned) {
      preview.value = cleaned;
    }
  }

  function queueCleanPreview() {
    window.requestAnimationFrame(cleanPreview);
  }

  document.addEventListener('DOMContentLoaded', cleanPreview);
  document.addEventListener('input', queueCleanPreview, true);
  document.addEventListener('change', queueCleanPreview, true);
  document.addEventListener('click', queueCleanPreview, true);
})();
