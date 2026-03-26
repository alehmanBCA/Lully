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