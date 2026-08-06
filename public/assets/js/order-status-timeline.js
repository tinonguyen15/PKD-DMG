(function () {
  document.querySelectorAll('[data-status-timeline]').forEach((form) => {
    const steps = Array.from(form.querySelectorAll('[data-status-step]'));
    const count = Math.max(steps.length, 1);

    function progressFor(index) {
      return count > 1 ? `${(index / (count - 1)) * 100}%` : '0%';
    }

    function setVisualStatus(button) {
      const targetStatus = button.value || '';
      const targetIndex = Math.max(0, parseInt(button.dataset.stepIndex || '0', 10) || 0);

      form.dataset.visualStatus = targetStatus;
      form.style.setProperty('--status-progress', progressFor(targetIndex));
      steps.forEach((step) => {
        const stepIndex = Math.max(0, parseInt(step.dataset.stepIndex || '0', 10) || 0);
        step.classList.toggle('is-current', step === button);
        step.classList.toggle('is-passed', stepIndex <= targetIndex);
      });
      form.classList.add('is-animating');
    }

    form.addEventListener('click', (event) => {
      const button = event.target.closest('[data-status-step]');
      if (!button || !form.contains(button)) return;

      event.preventDefault();
      const currentStatus = form.dataset.currentStatus || '';
      const targetStatus = button.value || '';
      if (targetStatus === currentStatus) {
        setVisualStatus(button);
        window.setTimeout(() => form.classList.remove('is-animating'), 260);
        return;
      }

      setVisualStatus(button);
      window.setTimeout(() => {
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit(button);
          return;
        }

        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = button.name;
        hidden.value = button.value;
        form.appendChild(hidden);
        form.submit();
      }, 280);
    }, true);
  });
})();