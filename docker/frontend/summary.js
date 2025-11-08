let currentChartData = null; // Zmienna do przechowywania aktualnych danych wykresu
let myChart = null;

async function loadSummaryData() {
    // ...existing code...
    
    // Po pobraniu danych zapisz je
    currentChartData = {
        labels: chartLabels,
        values: chartValues
    };
    
    renderChart(chartLabels, chartValues);
    
    // ...existing code...
}

function renderChart(labels, values) {
    const ctx = document.getElementById('workChart');
    if (!ctx) return;

    // Zniszcz poprzedni wykres jeśli istnieje
    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Godziny pracy',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // Dodaj opcję wyłączającą interakcje hover
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true // Tooltips nadal działają
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Godziny'
                    }
                }
            }
        }
    });
}