(function () {
  const form = document.querySelector('[data-order-create]');
  if (!form) return;

  function toast(message) {
    const root = document.querySelector('#toast-root');
    if (!root) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    root.appendChild(node);
    setTimeout(() => node.remove(), 2400);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Đã copy');
      return true;
    } catch (error) {
      toast('Không copy được, hãy chọn và copy thủ công');
      return false;
    }
  }

  form.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy-preview][data-submit-status-after-copy]');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const preview = form.querySelector('[data-order-preview]');
    const copied = await copyText(preview ? preview.value : '');
    if (!copied) return;

    const statusInput = form.querySelector('[data-submit-status]');
    if (statusInput) {
      statusInput.value = button.dataset.submitStatusAfterCopy || 'sent';
    }

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.submit();
    }
  }, true);
})();
