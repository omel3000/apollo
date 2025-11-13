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
    document.getElementById('dayName').textContent = dayName;
    document.getElementById('dateDisplay').textContent = dateStr;
    notifyDateChange();
  }

  document.addEventListener('DOMContentLoaded', function() {
    updateDateDisplay();

    document.getElementById('prevDayBtn').addEventListener('click', function() {
      currentDate.setDate(currentDate.getDate() - 1);
      window.currentDate = currentDate;
      updateDateDisplay();
    });

    document.getElementById('nextDayBtn').addEventListener('click', function() {
      currentDate.setDate(currentDate.getDate() + 1);
      window.currentDate = currentDate;
      updateDateDisplay();
    });

    document.getElementById('todayBtn').addEventListener('click', function() {
      currentDate = new Date();
      window.currentDate = currentDate;
      updateDateDisplay();
    });
  });
})();
