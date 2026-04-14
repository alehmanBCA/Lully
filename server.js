const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const app = express();

app.use(cors());
app.use(express.static('templates'));
app.use('/src', express.static('src'));

const port = process.env.PORT || 3000;
const host = '127.0.0.1';

// Internal state per-baby so each child can have independent vitals (random walk)
const hrState = {};     // babyId -> currentHr
const tempState = {};   // babyId -> currentTemp

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

function randomWalkInt(current, step) {
    const delta = Math.round((Math.random() - 0.5) * step * 2);
    return current + delta;
}

function randomWalkFloat(current, step) {
    const delta = (Math.random() - 0.5) * step * 2;
    return +(current + delta).toFixed(1);
}

app.get('/api/hr', (req, res) => {
    // Accept baby id to generate per-baby vitals: ?baby=1
    const babyId = String(req.query.baby || '0');
    const force = (req.query.force || '').toLowerCase();

    if (!(babyId in hrState)) {
        hrState[babyId] = 110 + Math.round((Math.random() - 0.5) * 6);
    }

    let currentHr = hrState[babyId];

    if (force === 'high') {
        currentHr = 180 + Math.round(Math.random() * 30);
    } else if (force === 'low') {
        currentHr = 30 + Math.round(Math.random() * 15);
    } else {
        currentHr = randomWalkInt(currentHr, 4);
        const roll = Math.random();
        if (roll < 0.08) {
            currentHr = 170 + Math.round(Math.random() * 40);
        } else if (roll < 0.16) {
            currentHr = 30 + Math.round(Math.random() * 20);
        }
        currentHr = clamp(currentHr, 30, 220);
    }

    hrState[babyId] = currentHr;
    res.json({ heartRate: currentHr });
});

app.get('/api/temperature', (req, res) => {
    const babyId = String(req.query.baby || '0');
    const forceT = (req.query.force || '').toLowerCase();

    if (!(babyId in tempState)) {
        tempState[babyId] = +(98.6 + (Math.random() - 0.5) * 0.5).toFixed(1);
    }

    let currentTemp = tempState[babyId];

    if (forceT === 'high') {
        currentTemp = +(101 + Math.random() * 3).toFixed(1);
    } else if (forceT === 'low') {
        currentTemp = +(93 + Math.random() * 2).toFixed(1);
    } else {
        currentTemp = randomWalkFloat(currentTemp, 0.25);
        const roll = Math.random();
        if (roll < 0.08) {
            currentTemp = +(101 + Math.random() * 3).toFixed(1);
        } else if (roll < 0.16) {
            currentTemp = +(93 + Math.random() * 2).toFixed(1);
        }
        currentTemp = clamp(currentTemp, 90.0, 106.0);
    }

    tempState[babyId] = currentTemp;
    res.json({ temperatureF: currentTemp });
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