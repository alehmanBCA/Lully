let hrChart = null;

function canRunMonitorScripts() {
    // Allow either the mock server URLs to be defined, or the Django
    // CURRENT_BABY_ID to be present so we can call the backend vitals API.
    return (typeof HR_API_URL !== 'undefined' && typeof TEMP_API_URL !== 'undefined') || typeof CURRENT_BABY_ID !== 'undefined';
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

// async function updateVitals() {
//     if (!canRunMonitorScripts()) return;
    
//     const hrElement = document.getElementById('live-hr');
//     const spo2Element = document.getElementById('live-spo2');
//     if (!hrElement || !spo2Element) return;
//     pulseHeartRateElement();
    
//     try {
//         const response = await fetch(`/api/baby/${CURRENT_BABY_ID}/vitals/`);
//         const data = await response.json();
        
//         hrElement.textContent = data.heart_rate ?? '--';
//         spo2Element.textContent = data.oxygen ?? data.oxygen_level ?? '--';

//         if (data.heart_rate && data.heart_rate > (data.max_heart_rate || 160)) {
//             showAlert(data.heart_rate);
//         }
//     } catch (error) {
//         console.error('Error fetching vitals:', error);
//     }
// }

// async function updateVitals() {
//     if (!canRunMonitorScripts()) return;
    
//     const hrElement = document.getElementById('live-hr');
//     const spo2Element = document.getElementById('live-spo2');
//     if (!hrElement || !spo2Element) return;
//     pulseHeartRateElement();
    
//     try {
//         const response = await fetch(`/api/baby/${CURRENT_BABY_ID}/vitals/`);
//         const data = await response.json();
        
//         hrElement.textContent = data.heart_rate ?? '--';
//         spo2Element.textContent = data.oxygen ?? data.oxygen_level ?? '--';

//         if (data.heart_rate && data.heart_rate > (data.max_heart_rate || 160)) {
//             showAlert(data.heart_rate);
//         }
//     } catch (error) {
//         console.error('Error fetching vitals:', error);
//     }
// }

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



function initChart() {
    if (!canRunMonitorScripts() || typeof Chart === 'undefined') {
        return;
    }

    const canvas = document.getElementById('hrChart');
    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext('2d');
    hrChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Heart Rate',
                data: [],
                borderColor: '#009FFF',
                backgroundColor: 'rgba(0, 159, 255, 0.1)',
                tension: 0.4,
                fill: true,
            }],
        },
        options: {
            scales: {
                y: {
                    min: 40,
                    max: 200,
                },
            },
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

async function fetchVitals() {
    if (!canRunMonitorScripts()) return;

    const hrElement = document.getElementById("live-hr");
    const tempElement = document.getElementById("live-temp");

    // If the front-end is pointed at the mock server, the responses are
    // separate endpoints. If not, fall back to the Django backend which
    // returns both values from `/api/baby/<id>/vitals/`.
    if (typeof HR_API_URL !== 'undefined' && HR_API_URL === TEMP_API_URL) {
        // Single combined endpoint (Django)
        try {
            const res = await fetch(HR_API_URL);
            if (!res.ok) throw new Error(`vitals response ${res.status}`);
            const data = await res.json();

            if (hrElement) {
                hrElement.textContent = data.heart_rate ?? '--';
                if (typeof data.heart_rate === 'number') {
                    hrElement.style.color = data.heart_rate > 150 ? "#ff6b6b" : "#03446F";
                }
            }
            if (tempElement) {
                tempElement.textContent = (typeof data.temperature === 'number') ? data.temperature.toFixed(1) : '--';
            }
        } catch (err) {
            console.error('Vitals fetch failed:', err);
            if (hrElement) hrElement.textContent = "--";
            if (tempElement) tempElement.textContent = "--";
        }
        return;
    }

    // Otherwise, try to fetch the separate mock endpoints (HR and Temp).
    // Heart rate
    try {
        const res = await fetch(HR_API_URL);
        const data = await res.json();
        if (hrElement) {
            hrElement.textContent = data.heartRate ?? '--';
            if (typeof data.heartRate === 'number') {
                hrElement.style.color = data.heartRate > 150 ? "#ff6b6b" : "#03446F";
            }
        }
    } catch (err) {
        console.error("HR fetch failed:", err);
        if (hrElement) hrElement.textContent = "--";
    }

    // Temperature
    try {
        const res = await fetch(TEMP_API_URL);
        const data = await res.json();
        if (tempElement) {
            tempElement.textContent = (typeof data.temperatureF === 'number') ? data.temperatureF.toFixed(1) : '--';
        }
    } catch (err) {
        console.error("Temp fetch failed:", err);
        if (tempElement) tempElement.textContent = "--";
    }
}

// Periodically refresh vitals using the unified fetch function.
setInterval(fetchVitals, 2000);
fetchVitals();


document.addEventListener('DOMContentLoaded', () => {

    if (canRunMonitorScripts()) {
        console.log("Live monitoring started...");
        fetchVitals();
        setInterval(fetchVitals, 5000);
    } else {
        console.error("Monitoring failed to start: API URLs are missing.");
    }
    // if (canRunMonitorScripts()) {
    //     updateVitals();
    //     initChart();
    //     updateChartHistory();

    //     setInterval(updateVitals, 5000);
    //     setInterval(updateChartHistory, 10000);
    // }
});