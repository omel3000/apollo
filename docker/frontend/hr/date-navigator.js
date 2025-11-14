(function() {
  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  let currentDate = new Date();
  window.currentDate = currentDate; // Global variable for current date

  function toApiDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function notifyDateChange() {
    const isoDate = toApiDate(currentDate);
    document.dispatchEvent(new CustomEvent('workdatechange', {
      detail: { date: isoDate }
    }));
    if (typeof window.handleWorkDateChange === 'function') {
      try {
        window.handleWorkDateChange(isoDate);
      } catch (error) {
        console.error('handleWorkDateChange error:', error);
      }
    }
  }

  function updateDateDisplay() {
    const dayName = dayNames[currentDate.getDay()];
    const dateStr = currentDate.toLocaleDateString('pl-PL');
    const dayNameEl = document.getElementById('dayName');
    const dateDisplayEl = document.getElementById('dateDisplay');
    if (dayNameEl) dayNameEl.textContent = dayName;
    if (dateDisplayEl) dateDisplayEl.textContent = dateStr;
    notifyDateChange();
  }

  // Listen for external date changes (from calendar clicks)
  document.addEventListener('calendardatechange', function(e) {
    if (e && e.detail && e.detail.date) {
      currentDate = new Date(e.detail.date);
      window.currentDate = currentDate;
      updateDateDisplay();
    }
  });

  document.addEventListener('DOMContentLoaded', function() {
    updateDateDisplay();

    const prevBtn = document.getElementById('prevDayBtn');
    const nextBtn = document.getElementById('nextDayBtn');
    const todayBtn = document.getElementById('todayBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        // Use window.currentDate to ensure we work with the latest date
        currentDate = new Date(window.currentDate);
        currentDate.setDate(currentDate.getDate() - 1);
        window.currentDate = currentDate;
        updateDateDisplay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        // Use window.currentDate to ensure we work with the latest date
        currentDate = new Date(window.currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
        window.currentDate = currentDate;
        updateDateDisplay();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', function() {
        currentDate = new Date();
        window.currentDate = currentDate;
        updateDateDisplay();
      });
    }
  });
})();
