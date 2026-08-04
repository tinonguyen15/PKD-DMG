(function () {
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (!currentPath.endsWith('/settings') && currentPath !== '/settings') return;

  const SAVE_DELAY = 600;
  const timers = new WeakMap();
  let toastTimer = 0;
  let toastNode = null;

  function notify(message, type = 'success') {
    const root = document.querySelector('#toast-root');
    if (!root) return;

    if (!toastNode) {
      toastNode = document.createElement('div');
      toastNode.className = 'toast settings-autosave-toast';
      root.appendChild(toastNode);
    }

    toastNode.textContent = message;
    toastNode.dataset.type = type;
    toastNode.hidden = false;

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      if (toastNode) toastNode.hidden = true;
    }, type === 'error' ? 2800 : 1500);
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

  function hideManualSaveButton(form) {
    if (!isAutosaveForm(form)) return;

    Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]')).forEach((button) => {
      const label = String(button.textContent || button.value || '').trim().toLowerCase();
      if (label.includes('lưu') || label.includes('save')) {
        button.hidden = true;
        button.disabled = true;
      }
    });
  }

  async function saveForm(form, options = {}) {
    if (!(form instanceof HTMLFormElement) || form.dataset.autosaveEnabled !== '1') return;

    if (form.dataset.autosaving === '1') {
      form.dataset.autosaveQueued = '1';
      return;
    }

    if (!form.checkValidity()) {
      notify('Thiếu thông tin, chưa tự lưu', 'error');
      return;
    }

    const nextFingerprint = fingerprint(form);
    if (!options.force && nextFingerprint === form.dataset.autosaveLastSaved) return;

    form.dataset.autosaving = '1';
    notify('Đang tự lưu...', 'pending');

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
        notify(payload && payload.message ? payload.message : 'Tự lưu thất bại', 'error');
        return;
      }

      form.dataset.autosaveLastSaved = fingerprint(form);
      notify('Đã tự lưu', 'success');
    } catch (error) {
      notify('Mất kết nối, chưa tự lưu', 'error');
    } finally {
      form.dataset.autosaving = '0';
      if (form.dataset.autosaveQueued === '1') {
        form.dataset.autosaveQueued = '0';
        saveForm(form, { force: true });
      }
    }
  }

  function shouldIgnoreTarget(target) {
    if (!(target instanceof HTMLElement)) return true;
    if (!target.matches('input, select, textarea')) return true;
    if (target.matches('input[name="password"]')) return true;
    return false;
  }

  function scheduleSave(form, delay) {
    if (!form || form.dataset.autosaveEnabled !== '1') return;

    const oldTimer = timers.get(form);
    if (oldTimer) window.clearTimeout(oldTimer);

    const nextTimer = window.setTimeout(() => saveForm(form), delay);
    timers.set(form, nextTimer);
  }

  function initAutosaveForms() {
    Array.from(document.forms || []).forEach((form) => {
      if (!isAutosaveForm(form)) return;

      form.dataset.autosaveEnabled = '1';
      form.dataset.autosaveLastSaved = fingerprint(form);
      hideManualSaveButton(form);
    });
  }

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (shouldIgnoreTarget(target)) return;
    scheduleSave(ownerForm(target), SAVE_DELAY);
  }, true);

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (shouldIgnoreTarget(target)) return;
    scheduleSave(ownerForm(target), 100);
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
