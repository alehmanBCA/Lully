// Angel's stuff
console.log("Monitoring Baby ID:", CURRENT_BABY_ID);


function showAlert(currentHr) {
    const modal = document.getElementById('alert-modal');
    const alertText = document.getElementById('alert-text');
    
    alertText.innerHTML = `Warning: Heart rate is <strong>${currentHr} BPM</strong>, which is above the safe limit!`;
    modal.style.display = 'flex';
    
    // Optional: Play a soft alert sound
    // let audio = new Audio('/static/sounds/alert.mp3');
    // audio.play();
}

function dismissAlert() {
    document.getElementById('alert-modal').style.display = 'none';
}

async function updateVitals() {
    try {
        const response = await fetch(`/api/baby/${CURRENT_BABY_ID}/vitals/`);
        const data = await response.json();

        document.getElementById('live-hr').textContent = data.heart_rate || "--";
        document.getElementById('live-spo2').textContent = data.oxygen || "--";

        if (data.heart_rate && data.heart_rate > data.max_heart_rate) {
            showAlert(data.heart_rate);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

// async function updateVitals() {
//     const hrElement = document.getElementById('live-hr');
//     const spo2Element = document.getElementById('live-spo2');

//     const hrVal = document.getElementById('live-hr');
//     hrVal.classList.remove('pulse-animation');
//     void hrVal.offsetWidth;
//     hrVal.classList.add('pulse-animation');

//     try {
//         const response = await fetch(`/api/baby/${CURRENT_BABY_ID}/vitals/`);
        
//         if (!response.ok) throw new Error('Network response was not ok');
        
//         const data = await response.json();

//         hrElement.textContent = data.heart_rate;
//         spo2Element.textContent = data.oxygen;
        
//         console.log("Vitals updated:", data);

//     } catch (error) {
//         console.error('Error fetching vitals:', error);
//     }
// }

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




async function fetchAndDisplayTemperature() {
    const temp = document.getElementById('temp');
    const heartRate = document.getElementById('hr');

    const lat = 34.1515;
    const lon = -89.63150;

    // const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&wind_speed_unit=mph&temperature_unit=fahrenheit`
    const apiUrl = '/api/temperature';

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`Response error: ${response.status}`);
        }

        const tempData = await response.json();

        const tempF = tempData.temperatureF ?? tempData.temperature;
        if (typeof tempF !== 'number') {
            throw new Error('unexpected payload: ' + JSON.stringify(tempData));
        }
        temp.textContent = `${tempF.toFixed(1)} °F`;

    } catch (error) {
        console.error('Error fetching temperature:', error);
        temp.textContent = 'Failed to load temperature';
    }
}

fetchAndDisplayTemperature();