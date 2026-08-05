(function () {
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

  document.addEventListener('DOMContentLoaded', hideLegacyMenuBlock);
})();
