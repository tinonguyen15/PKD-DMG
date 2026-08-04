(function () {
  const pagePath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pagePath !== '/settings') return;

  const SAVE_DELAY = 700;
  const forms = Array.from(document.querySelectorAll('form[method="post"]'));

  function toast(message) {
    const root = document.querySelector('#toast-root');
    if (!root) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    root.appendChild(node);
    setTimeout(() => node.remove(), 2200);
  }

  function actionPath(form) {
    return new URL(form.getAttribute('action') || window.location.href, window.location.href).pathname.replace(/\/+$/, '') || '/';
  }

  function isAutosaveForm(form) {
    const path = actionPath(form);
    const isSettingsAction = ['/settings/catalog', '/settings/users', '/settings/system-preferences'].includes(path);
    if (!isSettingsAction) return false;

    const hasExistingId = Boolean(form.querySelector('input[name="id"]'));
    const isSystemPreferences = path === '/settings/system-preferences';

    return hasExistingId || isSystemPreferences;
  }

  function fingerprint(form) {
    return new URLSearchParams(new FormData(form)).toString();
  }

  function statusNode(form) {
    let node = form.querySelector('[data-autosave-status]');
    if (node) return node;

    node = document.createElement('small');
    node.dataset.autosaveStatus = 'idle';
    node.className = 'autosave-status';
    node.textContent = 'Tự lưu đang bật';

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton && submitButton.parentElement) {
      submitButton.insertAdjacentElement('afterend', node);
    } else {
      form.appendChild(node);
    }

    return node;
  }

  function setStatus(form, message, state) {
    const node = statusNode(form);
    node.textContent = message;
    node.dataset.autosaveStatus = state;
  }

  async function saveForm(form, options = {}) {
    if (form.dataset.autosaving === '1') {
      form.dataset.autosaveQueued = '1';
      return;
    }

    if (!form.checkValidity()) {
      setStatus(form, 'Thiếu thông tin, chưa tự lưu', 'invalid');
      return;
    }

    const nextFingerprint = fingerprint(form);
    if (!options.force && nextFingerprint === form.dataset.autosaveLastSaved) {
      setStatus(form, 'Đã lưu', 'saved');
      return;
    }

    form.dataset.autosaving = '1';
    setStatus(form, 'Đang lưu...', 'saving');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
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
        const message = payload && payload.message ? payload.message : 'Tự lưu thất bại';
        setStatus(form, message, 'error');
        toast(message);
        return;
      }

      form.dataset.autosaveLastSaved = fingerprint(form);
      setStatus(form, payload && payload.message ? payload.message : 'Đã tự lưu', 'saved');
    } catch (error) {
      setStatus(form, 'Mất kết nối, chưa lưu', 'error');
      toast('Mất kết nối, chưa tự lưu được');
    } finally {
      form.dataset.autosaving = '0';
      if (form.dataset.autosaveQueued === '1') {
        form.dataset.autosaveQueued = '0';
        saveForm(form, { force: true });
      }
    }
  }

  function shouldIgnoreAutosaveEvent(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return true;
    if (!target.matches('input, select, textarea')) return true;

    // Mật khẩu vẫn dùng nút Lưu để tránh đổi nhầm khi đang gõ dở.
    if (target.matches('input[name="password"]')) return true;

    return false;
  }

  forms.forEach((form) => {
    if (!isAutosaveForm(form)) return;

    form.dataset.autosaveEnabled = '1';
    form.dataset.autosaveLastSaved = fingerprint(form);
    statusNode(form);

    let timer = 0;
    const scheduleSave = (delay) => {
      window.clearTimeout(timer);
      setStatus(form, 'Có thay đổi, sắp tự lưu...', 'pending');
      timer = window.setTimeout(() => saveForm(form), delay);
    };

    form.addEventListener('input', (event) => {
      if (shouldIgnoreAutosaveEvent(event)) return;
      scheduleSave(SAVE_DELAY);
    });

    form.addEventListener('change', (event) => {
      if (shouldIgnoreAutosaveEvent(event)) return;
      scheduleSave(120);
    });

    form.addEventListener('submit', (event) => {
      if (form.dataset.autosaveEnabled !== '1') return;
      event.preventDefault();
      window.clearTimeout(timer);
      saveForm(form, { force: true });
    });
  });
})();
