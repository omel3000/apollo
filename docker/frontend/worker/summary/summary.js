function formatHoursMinutes(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) {
        return `${minutes}min`;
    } else if (minutes === 0) {
        return `${hours}h`;
    } else {
        return `${hours}h ${minutes}min`;
    }
}

async function renderChart(data) {
    // ...existing code...
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            // ...existing code...
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const minutes = context.parsed.y;
                            return `${context.dataset.label}: ${formatHoursMinutes(minutes)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Czas (minuty)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatHoursMinutes(value);
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Dzień miesiąca'
                    }
                }
            }
        }
    });
}

// ...existing code...