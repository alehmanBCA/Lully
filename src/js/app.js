let hrChart, tempChart;

function initCharts() {
    const hrCanvas = document.getElementById("hrChart");
    const tempCanvas = document.getElementById("tempChart");

    if (hrCanvas) {
        const ctx = hrCanvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 159, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 159, 255, 0)');

        hrChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Heart Rate',
                    data: [],
                    borderColor: '#009FFF',
                    borderWidth: 4,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: gradient,
                }],
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: {
                        beginAtZero: false,
                        grid: { color: '#F0F0F0' },
                        ticks: { color: '#88A9C0' }
                    }
                }
            },
        });
    }

    if (tempCanvas) {
        const ctxTemp = tempCanvas.getContext('2d');
        
        const tempGradient = ctxTemp.createLinearGradient(0, 0, 0, 400);
        tempGradient.addColorStop(0, 'rgba(255, 107, 107, 0.4)');
        tempGradient.addColorStop(1, 'rgba(255, 107, 107, 0)');

        tempChart = new Chart(ctxTemp, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Temperature',
                    data: [],
                    borderColor: '#FF6B6B',
                    borderWidth: 4,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: tempGradient,
                }],
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: {
                        beginAtZero: false,
                        grid: { color: '#F0F0F0' },
                        ticks: { color: '#88A9C0' }
                    }
                }
            },
        });
    }
}

async function updateChartData() {
    if (typeof HISTORY_API_URL === 'undefined') return;

    try {
        const res = await fetch(HISTORY_API_URL);
        const data = await res.json();

        // Data from Django is newest-first, reverse for left-to-right chart rendering
        const heartRates = data.map(r => r.heart_rate).reverse();
        const temperatures = data.map(r => r.temperature).reverse();
        const labels = data.map(r => r.timestamp).reverse();

        if (hrChart) {
            hrChart.data.labels = labels;
            hrChart.data.datasets[0].data = heartRates;
            hrChart.update("none");
        }

        if (tempChart) {
            tempChart.data.labels = labels;
            tempChart.data.datasets[0].data = temperatures;
            tempChart.update("none");
        }

    } catch (err) {
        console.error("Chart update failed:", err);
    }
}

function pulseHeartRateElement() {
    const hrElement = document.getElementById('live-hr');
    if (!hrElement) return;
    
    hrElement.classList.remove('pulse-animation');
    void hrElement.offsetWidth; // Trigger reflow to restart animation
    hrElement.classList.add('pulse-animation');
}

async function fetchVitals() {
    if (typeof VITALS_API_URL === 'undefined') return;

    const hrElement = document.getElementById("live-hr");
    const tempElement = document.getElementById("live-temp");
    const statusText = document.getElementById("connection-status");
    const statusDot = document.querySelector(".status-dot");

    try {
        const res = await fetch(VITALS_API_URL);
        const data = await res.json();

        if (hrElement && data.heart_rate !== "--") {
            hrElement.textContent = data.heart_rate;
            hrElement.style.color = data.heart_rate > 150 ? "var(--danger-red)" : "var(--lully-navy)";
            pulseHeartRateElement();
        }

        if (tempElement && data.temperature !== "--") {
            tempElement.textContent = typeof data.temperature === "number" ? data.temperature.toFixed(1) : data.temperature;
            // Matches the bounds found in your views.py ALERT configuration
            tempElement.style.color = (data.temperature > 100.4 || data.temperature < 95.0) ? "var(--danger-red)" : "var(--lully-navy)";
        }

        if (statusText) {
            statusText.textContent = data.status;
            if (statusDot) {
                statusDot.style.backgroundColor = data.status === "Online" ? "var(--safe-green)" : "var(--danger-red)";
            }
        }

    } catch (err) {
        console.error("Failed to fetch from Django:", err);
        if (statusText) statusText.textContent = "Offline (Connection Error)";
        if (statusDot) statusDot.style.backgroundColor = "var(--danger-red)";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initCharts();
    fetchVitals();
    updateChartData();

    setInterval(fetchVitals, 2000);
    setInterval(updateChartData, 5000);
});