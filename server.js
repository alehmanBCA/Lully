const express = require('express');
const app = express();

app.use(express.static('templates'));
app.use('/src', express.static('src'));

const port = process.env.PORT || 3000;

app.get('/api/hr', (req, res) => {
    const base = 110;
    const variability = Math.round((Math.random() - 0.5) * 20);
    const hr = Math.max(50, base + variability);
    res.set('Access-Control-Allow-Origin', '*');
    res.json({ heartRate: hr });
});

app.get('/api/temperature', (req, res) => {
    const base = 98.6;
    const variability = (Math.random() - 0.5) * 1.5;
    const tempF = +(base + variability).toFixed(1);
    res.set('Access-Control-Allow-Origin', '*');
    res.json({ temperatureF: tempF });
});

app.listen(port, () => {
    console.log(`Mock HR API listening at http://localhost:${port}/api/hr`);
    console.log(`Mock Temperature API listening at http://localhost:${port}/api/temperature`);
});