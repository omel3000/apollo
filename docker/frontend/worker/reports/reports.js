document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.replace('/');
    return;
  }

  // Wypełnij listę projektów
  fetch('/user_projects/my_projects', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })
    .then(res => {
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.replace('/');
        return Promise.reject(new Error('Unauthorized'));
      }
      if (!res.ok) {
        return res.text().then(t => Promise.reject(new Error(t || 'Błąd pobierania projektów')));
      }
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data)) {
        alert('Błąd API: niepoprawny format odpowiedzi przy pobieraniu projektów.');
        return;
      }
      const select = document.getElementById('projektSelect');
      select.innerHTML = '';
      data.forEach(proj => {
        // poprawione pola na project_id i project_name
        const opt = document.createElement('option');
        opt.value = proj.project_id;
        opt.textContent = proj.project_name;
        select.appendChild(opt);
      });
    })
    .catch(err => {
      if (err && err.message !== 'Unauthorized') {
        console.error(err);
        alert('Nie udało się pobrać listy projektów.');
      }
    });

  // Obsługa zapisu wpisu
  document.getElementById('saveBtn').addEventListener('click', function(e) {
    e.preventDefault();

    const select = document.getElementById('projektSelect');
    const project_id = parseInt(select.value, 10);
    const description = document.getElementById('opis').value;
    const hours = parseInt(document.getElementById('czas_h').value, 10);
    const minutes = parseInt(document.getElementById('czas_m').value, 10);

    // Pobierz datę z JS nawigacji
    let work_date = window.getCurrentWorkDate ? window.getCurrentWorkDate() : null;
    if (!work_date) {
      // domyślnie dzisiaj
      const d = new Date();
      work_date = d.toISOString().slice(0,10);
    }

    // Walidacja
    if (!project_id) {
      alert('Wybierz projekt!');
      return;
    }
    if ((hours === 0 && minutes === 0) || hours > 24 || hours < 0 || minutes < 0 || minutes > 59) {
      alert('Podaj poprawny czas pracy (nie może być 0, max 24h)!');
      return;
    }

    fetch('/work_reports/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        project_id,
        work_date,
        hours_spent: hours,
        minutes_spent: minutes,
        description
      })
    })
    .then(res => {
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.replace('/');
        return Promise.reject(new Error('Unauthorized'));
      }
      if (res.ok) {
        alert('Wpis dodany!');
        document.querySelector('form[action="/worker/addreport"]').reset();
        return;
      }
      return res.text().then(t => { throw new Error(t || 'Błąd zapisu wpisu'); });
    })
    .catch(err => alert('Błąd: ' + (err?.message || 'Nieznany błąd')));
  });
});

// Funkcja do pobierania aktualnej daty z nawigacji
window.getCurrentWorkDate = function() {
  if (window.currentDate) {
    // Format: yyyy-mm-dd
    const d = window.currentDate;
    return d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0');
  }
  return null;
};
