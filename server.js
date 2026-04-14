const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const app = express();

app.use(cors());
app.use(express.static('templates'));
app.use('/src', express.static('src'));

const port = process.env.PORT || 3000;
const host = '127.0.0.1';

app.get('/api/hr', (req, res) => {
    const base = 110;
    const variability = Math.round((Math.random() - 0.5) * 20);
    const hr = Math.max(50, base + variability);
    res.json({ heartRate: hr });
    // res.set('Access-Control-Allow-Origin', '*');
    // res.json({ heartRate: hr });
});

app.get('/api/temperature', (req, res) => {
    const base = 98.6;
    const variability = (Math.random() - 0.5) * 1.5;
    const tempF = +(base + variability).toFixed(1);
    res.json({ temperatureF: tempF });
    // res.set('Access-Control-Allow-Origin', '*');
    // res.json({ temperatureF: tempF });
});

app.listen(port, host, () => {
    console.log(`Mock APIs running at http://${host}:${port}`);
});

// app.listen(port, host, () => {
//     const hrUrl = `http://${host}:${port}/api/hr`;
//     const tempUrl = `http://${host}:${port}/api/temperature`;
//     const rootUrl = `http://${host}:${port}/`;
//     console.log(`Mock HR API listening at ${hrUrl}`);
//     console.log(`Mock Temperature API listening at ${tempUrl}`);

//     exec(`open ${rootUrl}`, (err) => {
//         if (err) console.error('Failed to open browser:', err);
//     });
// });