(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let saveTimer = null;
  let saveController = null;
  let dragRow = null;
  let dragReadyRow = null;

  function statusNode() {
    return $('[data-profile-autosave-status]');
  }

  function setStatus(text, state = 'ready') {
    $$('[data-profile-autosave-status]').forEach((node) => {
      node.textContent = text;
      node.dataset.autosaveState = state;
    });
  }

  function hideLegacyMenuBlock() {
    document.querySelectorAll('.preference-group').forEach((group) => {
      const summaryText = group.querySelector('summary')?.textContent || '';
      if (!summaryText.includes('Món ghim & gần đây')) return;
      group.classList.add('legacy-menu-preferences-hidden');
      group.querySelectorAll('input, select, textarea, button').forEach((field) => {
        field.disabled = true;
      });
    });
  }

  function renumberMenuRows(root = document) {
    $$('[data-personal-menu-sortable]', root).forEach((tbody) => {
      $$('[data-personal-menu-row]', tbody).forEach((row, index) => {
        const input = $('[data-sort-input]', row);
        if (input) input.value = String((index + 1) * 10);
      });
    });
  }

  function rowAfterPointer(tbody, y) {
    const rows = $$('[data-personal-menu-row]:not(.is-dragging)', tbody);
    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    rows.forEach((row) => {
      const box = row.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closest = row;
      }
    });

    return closest;
  }

  function initDragSorting(form) {
    const tbody = $('[data-personal-menu-sortable]', form);
    if (!tbody) return;

    tbody.addEventListener('pointerdown', (event) => {
      const handle = event.target.closest('[data-drag-handle]');
      if (!handle) return;
      dragReadyRow = handle.closest('[data-personal-menu-row]');
      if (dragReadyRow) {
        dragReadyRow.setAttribute('draggable', 'true');
      }
    });

    tbody.addEventListener('dragstart', (event) => {
      const row = event.target.closest('[data-personal-menu-row]');
      if (!row || row !== dragReadyRow) {
        event.preventDefault();
        return;
      }

      dragRow = row;
      row.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.dataset.menuItemId || '');
    });

    tbody.addEventListener('dragover', (event) => {
      if (!dragRow) return;
      event.preventDefault();
      const after = rowAfterPointer(tbody, event.clientY);
      if (!after) {
        tbody.appendChild(dragRow);
      } else if (after !== dragRow) {
        tbody.insertBefore(dragRow, after);
      }
    });

    tbody.addEventListener('drop', (event) => {
      if (!dragRow) return;
      event.preventDefault();
      finishDrag(form, true);
    });

    tbody.addEventListener('dragend', () => {
      finishDrag(form, true);
    });
  }

  function finishDrag(form, shouldSave) {
    if (dragRow) {
      dragRow.classList.remove('is-dragging');
      dragRow.removeAttribute('draggable');
    }
    if (dragReadyRow) {
      dragReadyRow.removeAttribute('draggable');
    }
    dragRow = null;
    dragReadyRow = null;
    renumberMenuRows(form);
    if (shouldSave) {
      queueAutosave(form, 150);
    }
  }

  function formDataWithSortedRows(form) {
    renumberMenuRows(form);
    return new FormData(form);
  }

  async function saveNow(form) {
    if (!form || !form.action) return;

    if (saveController) {
      saveController.abort();
    }
    saveController = new AbortController();
    setStatus('Đang tự lưu...', 'saving');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formDataWithSortedRows(form),
        credentials: 'same-origin',
        signal: saveController.signal,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.saved === false) {
        throw new Error(payload.message || 'Không tự lưu được');
      }

      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setStatus(`Đã tự lưu ${time}`, 'saved');
    } catch (error) {
      if (error.name === 'AbortError') return;
      setStatus('Tự lưu lỗi, kiểm tra mạng rồi sửa lại', 'error');
    }
  }

  function queueAutosave(form, delay = 650) {
    if (!form) return;
    setStatus('Đang chờ tự lưu...', 'pending');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(form), delay);
  }

  function initAutosave(form) {
    form.addEventListener('input', (event) => {
      if (event.target.closest('[data-drag-handle]')) return;
      queueAutosave(form);
    });

    form.addEventListener('change', () => {
      queueAutosave(form, 250);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      saveNow(form);
    });
  }

  function init() {
    hideLegacyMenuBlock();
    const form = $('[data-profile-settings-form]');
    if (!form) return;
    renumberMenuRows(form);
    initDragSorting(form);
    initAutosave(form);
    if (statusNode()) {
      setStatus('Đã sẵn sàng tự lưu', 'ready');
    }
  }

  init();
  document.addEventListener('DOMContentLoaded', init);
})();
