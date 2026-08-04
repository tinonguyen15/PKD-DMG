(function () {
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (!currentPath.endsWith('/contacts') && currentPath !== '/contacts') return;

  const root = document.querySelector('[data-contacts-page]');
  if (!root) return;

  const saveUrl = root.dataset.contactSaveUrl || window.location.href;
  const csrf = root.dataset.contactCsrf || '';
  const timers = new WeakMap();

  function toast(message) {
    const toastRoot = document.querySelector('#toast-root');
    if (!toastRoot) {
      window.alert(message);
      return;
    }

    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    toastRoot.appendChild(node);
    setTimeout(() => node.remove(), 2200);
  }

  async function saveReceived(input) {
    const id = parseInt(input.dataset.contactId || '0', 10);
    if (!id) return;

    const value = Math.max(0, parseInt(input.value || '0', 10));
    input.value = String(value);

    const fingerprint = `${id}:${value}`;
    if (input.dataset.lastSaved === fingerprint) return;

    const formData = new FormData();
    formData.append('_csrf', csrf);
    formData.append('id', String(id));
    formData.append('received_count', String(value));

    input.dataset.saving = '1';

    try {
      const response = await fetch(saveUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok || (payload && payload.success === false)) {
        toast(payload && payload.message ? payload.message : 'Tự lưu thất bại');
        return;
      }

      input.dataset.lastSaved = fingerprint;
      toast(payload && payload.message ? payload.message : 'Đã tự lưu');
    } catch (error) {
      toast('Mất kết nối, chưa tự lưu được');
    } finally {
      input.dataset.saving = '0';
    }
  }

  function schedule(input, delay) {
    const oldTimer = timers.get(input);
    if (oldTimer) window.clearTimeout(oldTimer);

    const nextTimer = window.setTimeout(() => saveReceived(input), delay);
    timers.set(input, nextTimer);
  }

  document.querySelectorAll('[data-contact-received]').forEach((input) => {
    input.dataset.lastSaved = `${input.dataset.contactId || '0'}:${Math.max(0, parseInt(input.value || '0', 10))}`;
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-contact-received]')) return;
    schedule(input, 650);
  }, true);

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-contact-received]')) return;
    schedule(input, 80);
  }, true);
})();
