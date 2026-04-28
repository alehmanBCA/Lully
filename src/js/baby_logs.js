
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function quickLog(type, baseUrl) {
    const csrftoken = getCookie('csrftoken');

    if (!baseUrl) {
        console.error('Quick Log API URL not provided.');
        return;
    }

    fetch(baseUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
        },
        body: JSON.stringify({ type })
    })
    .then(() => {
        location.reload();
    })
    .catch(error => console.error('Error logging activity:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    const timeline = document.getElementById("timeline");

    if (timeline) {
        const apiUrl = timeline.getAttribute("data-api-url");
        if (apiUrl) {
            fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                data.forEach(event => {
                    if (event.type === "sleep" && event.end) {
                        const block = document.createElement("div");
                        block.style.position = "absolute";
                        block.style.height = "50px";
                        block.style.background = "#4da6ff";

                        const start = parseInt(event.start.split(":")[0]);
                        const end = parseInt(event.end.split(":")[0]);

                        block.style.left = (start / 24 * 100) + "%";
                        block.style.width = ((end - start) / 24 * 100) + "%";

                        timeline.appendChild(block);
                    }
                });
            })
            .catch(error => console.error('Error fetching timeline data:', error));
        }
    }
});

let sleepTimerInterval;
let sleepSecondsElapsed = 0;
let selectedSleepPosition = 'Back';

function openPanel(categoryTitle, iconHtml, panelId) {
    const slidePanel = document.getElementById('slidePanel');
    const panelOverlay = document.getElementById('panelOverlay');
    const titleElement = document.getElementById('panelTitle');

    titleElement.innerHTML = `<span id="panelIcon">${iconHtml}</span> Log ${categoryTitle}`;
    
    document.querySelectorAll('.panel-section').forEach(section => section.style.display = 'none');
    
    const activeSection = document.getElementById(panelId);
    if (activeSection) {
        activeSection.style.display = 'block';
        if (panelId === 'sleep-panel') setDefaultSleepTime();
        if (panelId === 'growth-panel') setDefaultGrowthTime();
    }

    slidePanel.classList.add('active');
    panelOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; 
}

function closePanel() {
    const slidePanel = document.getElementById('slidePanel');
    const panelOverlay = document.getElementById('panelOverlay');

    slidePanel.classList.remove('active');
    panelOverlay.classList.remove('active');
    document.body.style.overflow = ''; 
    
}

// document.getElementById('start-timer')?.addEventListener('click', () => {
//     const startBtn = document.getElementById('start-timer');
//     const stopBtn = document.getElementById('stop-timer');
    
//     startBtn.disabled = true;
//     stopBtn.disabled = false;

//     timerInterval = setInterval(() => {
//         secondsElapsed++;
//         const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
//         const secs = String(secondsElapsed % 60).padStart(2, '0');
//         document.getElementById('timer-display').textContent = `${mins}:${secs}`;
//     }, 1000);
// });

// document.getElementById('stop-timer')?.addEventListener('click', () => {
//     clearInterval(timerInterval);
//     document.getElementById('start-timer').disabled = false;
//     document.getElementById('stop-timer').disabled = true;
// });

// function saveFeeding(babyId) {
//     const duration = Math.round(secondsElapsed / 60);
//     const side = document.getElementById('feeding-side').value;

//     fetch(`/api/baby/${babyId}/feeding/save/`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'X-CSRFToken': getCookie('csrftoken')
//         },
//         body: JSON.stringify({ duration, side })
//     }).then(res => {
//         if (res.ok) {
//             location.reload();
//         } else {
//             console.error('Failed to save feeding data');
//         }
//     });
// }

let timerInterval = null;
let secondsElapsed = 0;
let selectedFeedingSide = 'B';

function setFeedingSide(side, element) {
    selectedFeedingSide = side;
    
    const parent = element.closest('#feeding-side-selector');
    parent.querySelectorAll('.feeding-btn').forEach(btn => btn.classList.remove('active'));
    
    element.classList.add('active');
}

function toggleTimer() {
    const timerDisplay = document.getElementById('timer-display');
    const timerBtn = document.getElementById('timer-btn');
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        if(timerBtn) timerBtn.innerText = "Start Timer";
    } else {
        if(timerBtn) timerBtn.innerText = "Stop Timer";
        timerInterval = setInterval(() => {
            secondsElapsed++;
            const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
            const secs = String(secondsElapsed % 60).padStart(2, '0');
            if(timerDisplay) timerDisplay.innerText = `${mins}:${secs}`;
        }, 1000);
    }
}

function saveFeeding(babyId) {
    const timeInput = document.getElementById('feeding-time'); 
    
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDateTime = new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16); 

    const timeToSave = (timeInput && timeInput.value) ? timeInput.value : localDateTime;
    const duration = Math.round(secondsElapsed / 60); 
    const side = selectedFeedingSide;

    fetch(`/api/baby/${babyId}/feeding/save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ 
            time: timeToSave, 
            duration: duration, 
            side: side 
        })
    }).then(res => {
        if (res.ok) {
            location.reload();
        }
    });
}

let selectedDiaperStatus = 'Pee';
let selectedDiaperColor = 'Yellow';

function setDiaperStatus(status, element) {
    selectedDiaperStatus = status;
    const container = document.getElementById('diaper-status-selector');
    container.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    
    const colorSection = document.getElementById('diaper-color-section');
    if (status === 'Clean') {
        colorSection.style.display = 'none';
        selectedDiaperColor = null;
    } else {
        colorSection.style.display = 'block';
    }
}

function setDiaperColor(color, element) {
    selectedDiaperColor = color;
    const container = document.getElementById('diaper-color-selector');
    container.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
}

function saveDiaper(babyId) {
    const timeInput = document.getElementById('diaper-time').value;
    const time = timeInput || new Date().toISOString().slice(0, 16);

    fetch(`/api/baby/${babyId}/diaper/detailed-save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ 
            time: time,
            status: selectedDiaperStatus,
            color: selectedDiaperColor
        })
    }).then(res => {
        if (res.ok) {
            location.reload(); 
        } else {
            alert("Error saving diaper log.");
        }
    });
}


// let selectedDiaperType = 'Both';

// function setDiaperType(type, element) {
//     selectedDiaperType = type;
//     document.querySelectorAll('.diaper-type-btn').forEach(btn => btn.classList.remove('active'));
//     element.classList.add('active');
// }

// function saveDetailedDiaper(babyId) {
//     const timeInput = document.getElementById('diaper-time').value;
//     const time = timeInput ? timeInput : new Date().toISOString().slice(0, 16);
//     const type = selectedDiaperType;

//     fetch(`/api/baby/${babyId}/diaper/detailed-save/`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'X-CSRFToken': getCookie('csrftoken')
//         },
//         body: JSON.stringify({ time, type })
//     }).then(res => {
//         if (res.ok) {
//             location.reload();
//         } else {
//             alert('Failed to save diaper log');
//         }
//     });
// }

function setDefaultSleepTime() {
    const timeInput = document.getElementById('sleep-start-time');
    if (timeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        timeInput.value = now.toISOString().slice(0, 16);
    }
}

function openDetailedSleepModal() {
    document.getElementById('sleep-modal').style.display = 'block';
    setDefaultSleepTime();
}

function toggleSleepTimer() {
    const timerDisplay = document.getElementById('sleep-timer-display');
    const timerBtn = document.getElementById('sleep-timer-btn');
    
    if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
        timerBtn.innerText = "Start Sleep Timer";
    } else {
        timerBtn.innerText = "Stop Sleep Timer";
        sleepTimerInterval = setInterval(() => {
            sleepSecondsElapsed++;
            const mins = String(Math.floor(sleepSecondsElapsed / 60)).padStart(2, '0');
            const secs = String(sleepSecondsElapsed % 60).padStart(2, '0');
            timerDisplay.innerText = `${mins}:${secs}`;
        }, 1000);
    }
}

function setSleepPosition(position, element) {
    selectedSleepPosition = position;
    const parent = element.closest('#sleep-position-selector');
    parent.querySelectorAll('.diaper-type-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
}

function saveSleep(babyId) {
    const startTimeInput = document.getElementById('sleep-start-time');
    const startTime = startTimeInput.value || new Date().toISOString().slice(0, 16);
    const duration = Math.round(sleepSecondsElapsed / 60);
    const position = selectedSleepPosition;

    fetch(`/api/baby/${babyId}/sleep/detailed-save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ 
            start_time: startTime, 
            duration: duration, 
            position: position 
        })
    }).then(res => {
        if (res.ok) {
            location.reload();
        } else {
            console.error('Failed to save sleep data');
        }
    });
}


// document.getElementById('start-sleep-timer')?.addEventListener('click', () => {
//     document.getElementById('start-sleep-timer').disabled = true;
//     document.getElementById('stop-sleep-timer').disabled = false;
    
//     sleepTimerInterval = setInterval(() => {
//         sleepSecondsElapsed++;
//         const mins = String(Math.floor(sleepSecondsElapsed / 60)).padStart(2, '0');
//         const secs = String(sleepSecondsElapsed % 60).padStart(2, '0');
//         document.getElementById('sleep-timer-display').textContent = `${mins}:${secs}`;
//     }, 1000);
// });

// document.getElementById('stop-sleep-timer')?.addEventListener('click', () => {
//     clearInterval(sleepTimerInterval);
//     document.getElementById('start-sleep-timer').disabled = false;
//     document.getElementById('stop-sleep-timer').disabled = true;
// });

// function setSleepPosition(position, element) {
//     selectedSleepPosition = position;
//     const parent = element.closest('.diaper-type-selector');
//     parent.querySelectorAll('.diaper-type-btn').forEach(btn => btn.classList.remove('active'));
//     element.classList.add('active');
// }

// function saveDetailedSleep(babyId) {
//     const time = document.getElementById('sleep-start-time').value;
//     const duration = Math.round(sleepSecondsElapsed / 60);
//     const position = selectedSleepPosition;

//     fetch(`/api/baby/${babyId}/sleep/detailed-save/`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'X-CSRFToken': getCookie('csrftoken')
//         },
//         body: JSON.stringify({ time, duration, position })
//     }).then(res => {
//         if (res.ok) location.reload();
//     });
// }

let currentMeasurementUnit = 'metric';

function setDefaultGrowthTime() {
    const timeInput = document.getElementById('growth-time');
    if (timeInput && !timeInput.value) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        timeInput.value = now.toISOString().slice(0, 16);
    }
}

function setMeasurementUnit(unit, element) {
    currentMeasurementUnit = unit;
    
    const parent = element.closest('#unit-selector');
    parent.querySelectorAll('.diaper-type-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    const weightLabel = document.getElementById('weight-label');
    const lengthLabel = document.getElementById('length-label');
    const headLabel = document.getElementById('head-label');

    if (unit === 'metric') {
        weightLabel.textContent = 'Weight (kg):';
        lengthLabel.textContent = 'Length (cm):';
        headLabel.textContent = 'Head Circumference (cm):';
    } else {
        weightLabel.textContent = 'Weight (lbs):';
        lengthLabel.textContent = 'Length (in):';
        headLabel.textContent = 'Head Circumference (in):';
    }
}

function saveGrowth(babyId) {
    const timeInput = document.getElementById('growth-time').value;
    const time = timeInput ? timeInput : new Date().toISOString().slice(0, 16);
    const weight = document.getElementById('growth-weight').value;
    const length = document.getElementById('growth-length').value;
    const headCirc = document.getElementById('growth-head').value;

    if (!weight && !length && !headCirc) {
        alert("Please enter at least one measurement before saving.");
        return;
    }

    fetch(`/api/baby/${babyId}/growth/save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ 
            time: time, 
            unit: currentMeasurementUnit,
            weight: weight,
            length: length,
            head_circumference: headCirc
        })
    }).then(res => {
        if (res.ok) {
            location.reload();
        } else {
            console.error('Failed to save growth data');
        }
    });
}

function saveDailyNotes(babyId) {
    const notesText = document.getElementById('daily-notes').value;

    fetch(`/api/baby/${babyId}/note/save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ notes: notesText })
    }).then(res => {
        if (res.ok) {
            alert('Daily notes saved successfully!');
        } else {
            console.error('Failed to save notes');
            alert('Failed to save notes.');
        }
    });
}

function toggleNotes() {
    const archive = document.getElementById("notesArchive");
    archive.style.display = archive.style.display === "none" ? "block" : "none";
}

// function saveMedicalNotes(babyId) {
//     const notes = document.getElementById('medical-notes').value;

//     fetch(`/api/baby/${babyId}/medical/notes/save/`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'X-CSRFToken': getCookie('csrftoken')
//         },
//         body: JSON.stringify({ notes: notes })
//     }).then(res => {
//         if (res.ok) {
//             // Remove the alert() and add this line instead:
//             location.reload(); 
//         } else {
//             alert("Error saving medical notes.");
//         }
//     });
// }

function saveMedicalNotes(babyId) {
    const notesInput = document.getElementById('medical-notes');
    const notesValue = notesInput.value;

    if (!notesValue) {
        alert("Please enter a note before saving.");
        return;
    }

    fetch(`/api/baby/${babyId}/medical/notes/save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ notes: notesValue })
    }).then(res => {
        if (res.ok) {
            location.reload(); 
            // notesInput.value = ""; 
            // alert("Note added to archive!");
        } else {
            alert("Error saving medical notes.");
        }
    });
}

function addMedication(babyId) {
    const name = document.getElementById('med-name').value;
    const dosage = document.getElementById('med-dosage').value;
    const times = document.getElementById('med-times').value;
    const days = document.getElementById('med-days').value;

    if (!name) {
        alert("Please fill out the medication name.");
        return;
    }

    fetch(`/api/baby/${babyId}/medical/medication/add/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ 
            name: name,
            dosage: dosage,
            times_per_day: parseInt(times) || 1,
            days_per_week: parseInt(days) || 7
        })
    }).then(res => {
        if (res.ok) {
            location.reload(); // Reload to show the new medication
        } else {
            alert("Error adding medication.");
        }
    });
}