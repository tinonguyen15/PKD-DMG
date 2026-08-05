(function () {
  const board = document.querySelector('[data-order-kanban]');
  if (!board) return;

  let draggingCard = null;
  let sourceColumn = null;
  let sourceNextSibling = null;
  let sourceStatus = '';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function toast(message) {
    const root = $('#toast-root');
    if (!root) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    root.appendChild(node);
    setTimeout(() => node.remove(), 2400);
  }

  function updateCounts() {
    $$('[data-kanban-column]', board).forEach((column) => {
      const count = $$('[data-order-card]', column).length;
      const countNode = $('[data-kanban-count]', column);
      const emptyNode = $('[data-kanban-empty]', column);
      if (countNode) countNode.textContent = String(count);
      if (emptyNode) emptyNode.hidden = count > 0;
    });
  }

  function csrfToken(card) {
    return card.querySelector("input[name='_csrf']")?.value || document.querySelector("input[name='_csrf']")?.value || '';
  }

  function setCardStatus(card, status) {
    card.dataset.currentStatus = status;
    const select = card.querySelector("select[name='workflow_status']");
    if (select) select.value = status;
  }

  async function saveStatus(card, status) {
    const url = card.dataset.statusUrl;
    if (!url) throw new Error('Thiếu URL cập nhật trạng thái.');

    const formData = new FormData();
    formData.append('_csrf', csrfToken(card));
    formData.append('workflow_status', status);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    if (!response.ok) {
      throw new Error('Không cập nhật được trạng thái.');
    }
  }

  function restoreCard() {
    if (!draggingCard || !sourceColumn) return;
    const sourceList = $('[data-kanban-list]', sourceColumn) || sourceColumn;
    if (sourceNextSibling && sourceNextSibling.parentElement === sourceList) {
      sourceList.insertBefore(draggingCard, sourceNextSibling);
    } else {
      sourceList.appendChild(draggingCard);
    }
    setCardStatus(draggingCard, sourceStatus);
    updateCounts();
  }

  function cleanupDrag() {
    if (draggingCard) {
      draggingCard.classList.remove('is-dragging', 'is-updating');
    }
    $$('[data-kanban-column]', board).forEach((column) => column.classList.remove('is-drag-over'));
    draggingCard = null;
    sourceColumn = null;
    sourceNextSibling = null;
    sourceStatus = '';
  }

  board.addEventListener('dragstart', (event) => {
    const card = event.target.closest('[data-order-card]');
    if (!card) return;
    if (event.target.closest('a, button, select, input, textarea')) {
      event.preventDefault();
      return;
    }

    draggingCard = card;
    sourceColumn = card.closest('[data-kanban-column]');
    sourceNextSibling = card.nextElementSibling;
    sourceStatus = card.dataset.currentStatus || sourceColumn?.dataset.workflowStatus || '';
    card.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.dataset.orderId || '');
  });

  board.addEventListener('dragover', (event) => {
    if (!draggingCard) return;
    const column = event.target.closest('[data-kanban-column]');
    if (!column) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    $$('[data-kanban-column]', board).forEach((item) => item.classList.toggle('is-drag-over', item === column));
  });

  board.addEventListener('dragleave', (event) => {
    const column = event.target.closest('[data-kanban-column]');
    if (!column || column.contains(event.relatedTarget)) return;
    column.classList.remove('is-drag-over');
  });

  board.addEventListener('drop', async (event) => {
    if (!draggingCard) return;
    const targetColumn = event.target.closest('[data-kanban-column]');
    if (!targetColumn) return;
    event.preventDefault();

    const targetStatus = targetColumn.dataset.workflowStatus || '';
    if (!targetStatus || targetStatus === sourceStatus) {
      cleanupDrag();
      updateCounts();
      return;
    }

    const targetList = $('[data-kanban-list]', targetColumn) || targetColumn;
    targetList.appendChild(draggingCard);
    setCardStatus(draggingCard, targetStatus);
    draggingCard.classList.add('is-updating');
    updateCounts();

    try {
      await saveStatus(draggingCard, targetStatus);
      toast('Đã cập nhật trạng thái đơn');
      cleanupDrag();
      updateCounts();
    } catch (error) {
      toast(error.message || 'Không cập nhật được trạng thái');
      restoreCard();
      cleanupDrag();
    }
  });

  board.addEventListener('dragend', () => {
    cleanupDrag();
    updateCounts();
  });

  updateCounts();
})();
