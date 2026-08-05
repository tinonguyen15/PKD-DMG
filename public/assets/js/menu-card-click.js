(function () {
  const form = document.querySelector('[data-order-create]');
  if (!form) return;

  function isInteractiveTarget(target) {
    return Boolean(target.closest('button, input, select, textarea, label, a, [data-qty-step], [data-item-note-row], .qty-control'));
  }

  function syncNoteState(card) {
    const noteInput = card.querySelector('[data-item-note-row] input');
    if (!noteInput) return;
    card.classList.toggle('has-note', noteInput.value.trim() !== '');
  }

  form.querySelectorAll('[data-menu-card]').forEach(syncNoteState);

  form.addEventListener('input', (event) => {
    const noteInput = event.target.closest('[data-item-note-row] input');
    if (!noteInput) return;
    const card = noteInput.closest('[data-menu-card]');
    if (card) syncNoteState(card);
  });

  form.addEventListener('click', (event) => {
    const card = event.target.closest('[data-menu-card]');
    if (!card || !form.contains(card)) return;
    if (isInteractiveTarget(event.target)) return;

    const input = card.querySelector('.qty-input');
    if (!input || input.disabled) return;

    const next = Math.max(0, (parseInt(input.value || '0', 10) || 0) + 1);
    input.value = String(next);
    card.classList.add('is-card-picked', 'is-note-open');
    syncNoteState(card);
    window.setTimeout(() => card.classList.remove('is-card-picked'), 180);

    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
})();
