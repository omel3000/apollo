(function() {
  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  let currentDate = new Date();

  function updateDateDisplay() {
    const dayName = dayNames[currentDate.getDay()];
    const dateStr = currentDate.toLocaleDateString('pl-PL');
    document.getElementById('dayName').textContent = dayName;
    document.getElementById('dateDisplay').textContent = dateStr;
  }

  document.addEventListener('DOMContentLoaded', function() {
    updateDateDisplay();

    document.getElementById('prevDayBtn').addEventListener('click', function() {
      currentDate.setDate(currentDate.getDate() - 1);
      updateDateDisplay();
    });

    document.getElementById('nextDayBtn').addEventListener('click', function() {
      currentDate.setDate(currentDate.getDate() + 1);
      updateDateDisplay();
    });

    document.getElementById('todayBtn').addEventListener('click', function() {
      currentDate = new Date();
      updateDateDisplay();
    });
  });
})();
