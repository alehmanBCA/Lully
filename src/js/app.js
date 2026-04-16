
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
    try {
        const res = await fetch(HISTORY_API_URL);
        const data = await res.json();

        const heartRates = data.map(r => r.heart_rate).reverse();
        const temperatures = data.map(r => r.temperature).reverse();
        
        const labels = data.map(r => r.timestamp).reverse();

        if (hrChart) {
            hrChart.data.labels = labels;
            hrChart.data.datasets[0].data = heartRates;
            hrChart.update("none");
        }

        if (typeof tempChart !== 'undefined') {
            tempChart.data.labels = labels;
            tempChart.data.datasets[0].data = temperatures;
            tempChart.update("none");
        }

    } catch (err) {
        console.error("Chart update failed:", err);
    }
}

function canRunMonitorScripts() {
    return typeof HR_API_URL !== 'undefined' && typeof TEMP_API_URL !== 'undefined';
}

function showAlert(currentHr) {
    const modal = document.getElementById('alert-modal');
    const alertText = document.getElementById('alert-text');
    if (modal && alertText) {
        alertText.innerHTML = `Warning: Heart rate is <strong>${currentHr} BPM</strong>, which is above the safe limit!`;
        modal.style.display = 'flex';
    }
}

function dismissAlert() {
    const modal = document.getElementById('alert-modal');
    if (modal) modal.style.display = 'none';
}

function pulseHeartRateElement() {
    const hrElement = document.getElementById('live-hr');
    if (!hrElement) return;
    hrElement.classList.remove('pulse-animation');
    void hrElement.offsetWidth;
    hrElement.classList.add('pulse-animation');
}


async function updateVitals() {
    if (!canRunMonitorScripts()) return;
    
    const hrElement = document.getElementById('live-hr');
    const tempElement = document.getElementById('live-temp');
    const tempElement = document.getElementById('live-temp');
    
    try {
        const hrResponse = await fetch(HR_API_URL);
        const hrData = await hrResponse.json();
        if (hrElement) {
            hrElement.textContent = hrData.heartRate;
            if (hrData.heartRate > 150) hrElement.style.color = "#ff6b6b";
            else hrElement.style.color = "#03446F";
        }
    } catch (err) {
        console.error("Heart Rate API Error:", err);
    }

    try {
        const tempResponse = await fetch(TEMP_API_URL);
        const tempData = await tempResponse.json();
        if (tempElement) {
            tempElement.textContent = tempData.temperatureF.toFixed(1);
        }
    } catch (err) {
        console.error("Temperature API Error:", err);
    }
}


async function updateChartHistory() {
    if (!canRunMonitorScripts() || !hrChart) {
        return;
    }

    try {
        const response = await fetch(`/api/baby/${CURRENT_BABY_ID}/history/`);
        if (!response.ok) {
            throw new Error(`History response error: ${response.status}`);
        }

        const data = await response.json();
        const history = Array.isArray(data) ? data.slice().reverse() : [];

        hrChart.data.labels = history.map((record) => record.timestamp);
        hrChart.data.datasets[0].data = history.map((record) => record.heart_rate);
        hrChart.update();
    } catch (error) {
        console.error('Error fetching history:', error);
    }
}


async function fetchVitals() {
    const hrElement = document.getElementById("live-hr");
    const tempElement = document.getElementById("live-temp");

    // Otherwise, try to fetch the separate mock endpoints (HR and Temp).
    // Heart rate
    try {
        const res = await fetch(VITALS_API_URL);
        const data = await res.json();

        if (hrElement && data.heart_rate) {
            hrElement.textContent = data.heart_rate;
            hrElement.style.color = data.heart_rate > 150 ? "#FF6B6B" : "#03446F";
        }

        if (tempElement && data.temperature) {
            if (typeof data.temperature === "number") {
                tempElement.textContent = data.temperature.toFixed(1);
            } else {
                tempElement.textContent = data.temperature; 
            }
        }
    } catch (err) {
        console.error("Failed to fetch from Django:", err);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    initCharts();

    fetchVitals();
    updateChartData();

    setInterval(fetchVitals, 2000);
    
    setInterval(updateChartData, 5000);
});