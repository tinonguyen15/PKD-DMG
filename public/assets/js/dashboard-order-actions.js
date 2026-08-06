(function () {
  document.addEventListener('submit', (event) => {
    const reopenForm = event.target.closest('[data-dashboard-reopen-form]');
    if (reopenForm) {
      const code = reopenForm.dataset.orderCode || 'đơn này';
      const ok = window.confirm(`${code} đã gửi CN. Sửa lại sẽ chuyển đơn về Đang xử lý và cần Copy gửi CN lại. Tiếp tục?`);
      if (!ok) event.preventDefault();
      return;
    }

    const blacklistForm = event.target.closest('[data-dashboard-blacklist-form]');
    if (blacklistForm) {
      const code = blacklistForm.dataset.orderCode || 'đơn này';
      const input = blacklistForm.querySelector('[data-dashboard-blacklist-reason]');
      const reason = window.prompt(`Nhập lý do thêm ${code} vào blacklist:`, '');
      if (reason === null) {
        event.preventDefault();
        return;
      }

      const text = reason.trim();
      if (!text) {
        event.preventDefault();
        window.alert('Vui lòng nhập lý do blacklist để nhân viên khác nắm thông tin.');
        return;
      }

      if (input) input.value = text;
      return;
    }

    const deleteForm = event.target.closest('[data-dashboard-delete-form]');
    if (!deleteForm) return;

    const code = deleteForm.dataset.orderCode || 'đơn này';
    const ok = window.confirm(`Xóa ${code}?\n\nThao tác này không hoàn tác được. Bạn chắc chắn muốn xóa?`);
    if (!ok) {
      event.preventDefault();
    }
  }, true);
})();
