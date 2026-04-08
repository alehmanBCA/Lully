let hrChart = null;

function canRunMonitorScripts() {
    return typeof CURRENT_BABY_ID !== 'undefined' && CURRENT_BABY_ID;
}

function pulseHeartRateElement() {
    const hrElement = document.getElementById('live-hr');
    if (!hrElement) {
        return;
    }

    hrElement.classList.remove('pulse-animation');
    void hrElement.offsetWidth;
    hrElement.classList.add('pulse-animation');
}

async function updateVitals() {
    if (!canRunMonitorScripts()) {
        return;
    }

    const hrElement = document.getElementById('live-hr');
    const spo2Element = document.getElementById('live-spo2');

    if (!hrElement || !spo2Element) {
        return;
    }

    pulseHeartRateElement();

    try {
        const response = await fetch(`/api/baby/${CURRENT_BABY_ID}/vitals/`);
        if (!response.ok) {
            throw new Error(`Vitals response error: ${response.status}`);
        }

        const data = await response.json();
        hrElement.textContent = data.heart_rate ?? '--';
        spo2Element.textContent = data.oxygen ?? data.oxygen_level ?? '--';
    } catch (error) {
        console.error('Error fetching vitals:', error);
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

async function fetchAndDisplayTemperature() {
    const tempElement = document.getElementById('temp');
    if (!tempElement) {
        return;
    }

    try {
        const response = await fetch('/api/temperature');
        if (!response.ok) {
            throw new Error(`Temperature response error: ${response.status}`);
        }

        const tempData = await response.json();
        const tempF = tempData.temperatureF ?? tempData.temperature;

        if (typeof tempF !== 'number') {
            throw new Error(`Unexpected payload: ${JSON.stringify(tempData)}`);
        }

        tempElement.textContent = `${tempF.toFixed(1)} °F`;
    } catch (error) {
        console.error('Error fetching temperature:', error);
        tempElement.textContent = 'Failed to load temperature';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayTemperature();

    if (canRunMonitorScripts()) {
        updateVitals();
        initChart();
        updateChartHistory();

        setInterval(updateVitals, 5000);
        setInterval(updateChartHistory, 10000);
    }
});