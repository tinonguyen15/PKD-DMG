(function () {
  document.addEventListener('click', (event) => {
    const card = event.target.closest('[data-open-order-url]');
    if (card && !event.target.closest('a, button, form, input, textarea, select')) {
      window.location.href = card.dataset.openOrderUrl;
      return;
    }
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('.active-order-reopen-form');
    if (!form) return;

    const ok = window.confirm('Đơn này đã gửi CN. Sửa lại sẽ chuyển đơn về Đang xử lý và cần Copy gửi CN lại. Tiếp tục?');
    if (!ok) {
      event.preventDefault();
    }
  }, true);
})();
