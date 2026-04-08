// Angel's stuff
console.log("Monitoring Baby ID:", CURRENT_BABY_ID);

async function updateVitals() {
    const hrElement = document.getElementById('live-hr');
    const spo2Element = document.getElementById('live-spo2');

    const hrVal = document.getElementById('live-hr');
    hrVal.classList.remove('pulse-animation');
    void hrVal.offsetWidth;
    hrVal.classList.add('pulse-animation');

    try {
        const response = await fetch(`/api/baby/${CURRENT_BABY_ID}/vitals/`);
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();

        hrElement.textContent = data.heart_rate;
        spo2Element.textContent = data.oxygen;
        
        console.log("Vitals updated:", data);

    } catch (error) {
        console.error('Error fetching vitals:', error);
    }
}

updateVitals();

setInterval(updateVitals, 5000);


let hrChart;

function initChart() {
    const ctx = document.getElementById('hrChart').getContext('2d');
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
                fill: true
            }]
        },
        options: {
            scales: { y: { min: 40, max: 200 } }
        }
    });
}

async function updateChartHistory() {
    const response = await fetch(`/api/baby/${CURRENT_BABY_ID}/history/`);
    const data = await response.json();
    
    const history = data.reverse(); 
    
    hrChart.data.labels = history.map(r => r.timestamp);
    hrChart.data.datasets[0].data = history.map(r => r.heart_rate);
    hrChart.update();
}

initChart();
setInterval(updateChartHistory, 10000);
// Angel's stuff




console.log("Testing")
async function fetchAndDisplayTemperature() {
    const temp = document.getElementById('temp');

    const lat = 34.1515;
    const lon = -89.63150;

    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&wind_speed_unit=mph&temperature_unit=fahrenheit`

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`Response error: ${response.status}`);
        }

        const tempData = await response.json();

        const tempF = tempData.hourly.temperature_2m[0];

        temp.textContent = `${tempF.toFixed(1)} °F`;

    } catch (error) {
        console.error('Error fetching temperature:', error);
        temp.textContent = 'Failed to load temperature';
    }
}

fetchAndDisplayTemperature();