(function () {
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (!currentPath.endsWith('/settings') && currentPath !== '/settings') return;

  const SAVE_DELAY = 700;
  const timers = new WeakMap();

  function toast(message) {
    const root = document.querySelector('#toast-root');
    if (!root) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    root.appendChild(node);
    setTimeout(() => node.remove(), 2200);
  }

  function normalizedPath(value) {
    return new URL(value || window.location.href, window.location.href).pathname.replace(/\/+$/, '') || '/';
  }

  function actionPath(form) {
    return normalizedPath(form.getAttribute('action') || window.location.href);
  }

  function isSettingsAction(path, suffix) {
    return path === suffix || path.endsWith(suffix);
  }

  function controlsOf(form) {
    return Array.from(form.elements || []).filter((control) => control instanceof HTMLElement);
  }

  function isAutosaveForm(form) {
    if (!(form instanceof HTMLFormElement)) return false;

    const path = actionPath(form);
    const isCatalog = isSettingsAction(path, '/settings/catalog');
    const isUsers = isSettingsAction(path, '/settings/users');
    const isSystemPreferences = isSettingsAction(path, '/settings/system-preferences');

    if (!isCatalog && !isUsers && !isSystemPreferences) return false;

    const controls = controlsOf(form);
    const hasExistingId = controls.some((control) => control.getAttribute('name') === 'id');

    // Form thêm mới vẫn cần bấm nút Thêm để tránh tạo dữ liệu rác khi đang nhập dở.
    return hasExistingId || isSystemPreferences;
  }

  function ownerForm(target) {
    if (!(target instanceof HTMLElement)) return null;
    if ('form' in target && target.form instanceof HTMLFormElement) return target.form;
    return target.closest('form');
  }

  function fingerprint(form) {
    return new URLSearchParams(new FormData(form)).toString();
  }

  function statusNode(form) {
    const existing = form.querySelector('[data-autosave-status]');
    if (existing) return existing;

    const node = document.createElement('small');
    node.dataset.autosaveStatus = 'idle';
    node.className = 'autosave-status';
    node.textContent = 'Tự lưu đang bật';

    const controls = controlsOf(form);
    const submitButton = controls.find((control) => control.matches('button[type="submit"], input[type="submit"]'));
    const anchor = submitButton || controls[controls.length - 1];

    if (anchor && anchor.parentElement) {
      anchor.insertAdjacentElement('afterend', node);
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
    if (!form || form.dataset.autosaveEnabled !== '1') return;

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

  function shouldIgnoreAutosaveTarget(target) {
    if (!(target instanceof HTMLElement)) return true;
    if (!target.matches('input, select, textarea')) return true;

    // Mật khẩu vẫn dùng nút Lưu để tránh đổi nhầm khi đang gõ dở.
    if (target.matches('input[name="password"]')) return true;

    return false;
  }

  function scheduleSave(form, delay) {
    if (!form || form.dataset.autosaveEnabled !== '1') return;

    const oldTimer = timers.get(form);
    if (oldTimer) window.clearTimeout(oldTimer);

    setStatus(form, 'Có thay đổi, sắp tự lưu...', 'pending');
    const nextTimer = window.setTimeout(() => saveForm(form), delay);
    timers.set(form, nextTimer);
  }

  function initAutosaveForms() {
    const forms = Array.from(document.forms || []);
    let enabledCount = 0;

    forms.forEach((form) => {
      if (!isAutosaveForm(form)) return;

      form.dataset.autosaveEnabled = '1';
      form.dataset.autosaveLastSaved = fingerprint(form);
      statusNode(form);
      enabledCount += 1;
    });

    if (enabledCount > 0) {
      console.info(`[settings-autosave] Enabled ${enabledCount} settings forms.`);
    } else {
      console.warn('[settings-autosave] No editable settings forms detected.');
    }
  }

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (shouldIgnoreAutosaveTarget(target)) return;

    scheduleSave(ownerForm(target), SAVE_DELAY);
  }, true);

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (shouldIgnoreAutosaveTarget(target)) return;

    scheduleSave(ownerForm(target), 120);
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.dataset.autosaveEnabled !== '1') return;

    event.preventDefault();
    const oldTimer = timers.get(form);
    if (oldTimer) window.clearTimeout(oldTimer);
    saveForm(form, { force: true });
  }, true);

  initAutosaveForms();
})();
