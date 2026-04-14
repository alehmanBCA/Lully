let hrChart = null;

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

// function initChart() {
//     if (!canRunMonitorScripts() || typeof Chart === 'undefined') {
//         return;
//     }

//     const canvas = document.getElementById('hrChart');
//     if (!canvas) {
//         return;
//     }

//     const ctx = canvas.getContext('2d');
//     hrChart = new Chart(ctx, {
//         type: 'line',
//         data: {
//             labels: [],
//             datasets: [{
//                 label: 'Heart Rate',
//                 data: [],
//                 borderColor: '#009FFF',
//                 backgroundColor: 'rgba(0, 159, 255, 0.1)',
//                 tension: 0.4,
//                 fill: true,
//             }],
//         },
//         options: {
//             scales: {
//                 y: {
//                     min: 40,
//                     max: 200,
//                 },
//             },
//         },
//     });
// }
function initChart() {
    const canvas = document.getElementById('hrChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
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

// async function fetchVitals() {
//     if (!canRunMonitorScripts()) return;

//     const hrElement = document.getElementById("live-hr");
//     const tempElement = document.getElementById("live-temp");

//     try {
//         const res = await fetch(HR_API_URL);
//         const data = await res.json();
        
//         if (hrElement && typeof data.heartRate === "number") {
//             hrElement.textContent = data.heartRate;
//             hrElement.style.color = data.heartRate > 150 ? "#ff6b6b" : "#03446F";
//         }
//     } catch (err) {
//         console.error("HR fetch failed:", err);
//         if (hrElement) hrElement.textContent = "--";
//     }

//     try {
//         const res = await fetch(TEMP_API_URL);
//         const data = await res.json();
        
//         if (tempElement && typeof data.temperatureF === "number") {
//             tempElement.textContent = data.temperatureF.toFixed(1);
//         }
//     } catch (err) {
//         console.error("Temp fetch failed:", err);
//         if (tempElement) tempElement.textContent = "--";
//     }
// }
async function fetchVitals() {
    const hrElement = document.getElementById("live-hr");
    const tempElement = document.getElementById("live-temp");

    try {
        const res = await fetch(VITALS_API_URL);
        const data = await res.json();

        if (hrElement && data.heart_rate) {
            hrElement.textContent = data.heart_rate;
            hrElement.style.color = data.heart_rate > 150 ? "red" : "#03446F";
        }

        if (tempElement && data.temperature) {
            tempElement.textContent = data.temperature.toFixed(1);
        }

    } catch (err) {
        console.error("Failed to fetch from Django:", err);
    }
}



document.addEventListener('DOMContentLoaded', () => {
    console.log("Live monitoring started via Django Proxy...");
    fetchVitals(); // Initial load
    setInterval(fetchVitals, 2000); // Refresh every 2 seconds
});