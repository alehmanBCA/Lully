
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
        if (panelId === 'diaper-panel') setDefaultDiaperTime();
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

function quickStartFeeding() {
    openPanel('Feeding', '🍼', 'feeding-panel');

    const bothRadio = document.querySelector('input[name="side"][value="B"]');
    if (bothRadio) {
        bothRadio.checked = true;
    }

    if (!timerInterval) {
        toggleTimer();
    }
}

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

function quickSaveDiaper(babyId) {
    openPanel('Diaper', '🧷', 'diaper-panel');

    const quickData = {
        time: new Date().toISOString().slice(0, 16),
        status: 'Both',
        color: 'Yellow/Brown',
        notes: 'Quick logged: Wet & Dirty (Yellow/Brown)'
    };

    fetch(`/api/baby/${babyId}/diaper/detailed-save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(quickData)
    })
    .then(response => {
        if (response.ok) {
            const panel = document.getElementById('diaper-panel');
            panel.innerHTML = '<div style="text-align:center; padding: 20px;"><h3>✅ Saved!</h3><p>Reloading...</p></div>';
            
            setTimeout(() => {
                location.reload();
            }, 800);
        } else {
            alert("Error auto-saving diaper log.");
            }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Failed to connect to server.");
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

function setDefaultDiaperTime() {
    const timeInput = document.getElementById('diaper-time');
    if (timeInput) {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
        timeInput.value = localISOTime;
    }
}

function saveDiaper(babyId) {
    // 1. Get the value from the 'Time of Change' input field
    const timeInput = document.getElementById('diaper-time').value;
    
    // 2. Use the input value, or fallback to current time if the field is empty
    // const time = timeInput || new Date().toISOString();
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const time = timeInput || new Date(now.getTime() - offset).toISOString().slice(0, 16);

    fetch(`/api/baby/${babyId}/diaper/detailed-save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            time: time,  // This now sends your inputted date and time
            status: selectedDiaperStatus,
            color: selectedDiaperColor
        })
    }).then(res => {
        if (res.ok) {
            location.reload(); // Refresh to show the new entry immediately
        }
    });
}

function quickStartSleep(babyId, preferredPosition) {
    openPanel('Sleep', '😴', 'sleep-panel');

        const positionButtons = document.querySelectorAll('#sleep-position-selector .diaper-type-btn');
        positionButtons.forEach(btn => {
            if (btn.innerText.trim().includes(preferredPosition)) {
                btn.click(); 
            }
        });

        const timerBtn = document.getElementById('sleep-timer-btn');
    if (timerBtn && timerBtn.innerText.includes('Start')) {
            toggleSleepTimer(); 
        }
    }

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

    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);

    const startTime = startTimeInput.value || localISOTime;
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

    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);

    const time = timeInput ? timeInput : localISOTime;

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
            location.reload(); 
        } else {
            alert('Failed to save daily notes.');
        }
    });
}

function toggleNotes() {
    const archive = document.getElementById("notesArchive");
    archive.style.display = archive.style.display === "none" ? "block" : "none";
}

function saveMedicalNotes(babyId) {
    const notesInput = document.getElementById('medical-notes');
    const notesValue = notesInput.value;

    if (!notesValue.trim()) {
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
            location.reload();
        } else {
            alert("Error adding medication.");
        }
    });
}
function deleteMedication(medId) {
    if (!confirm("Are you sure you want to remove this medication?")) {
        return;
    }

    fetch(`/api/medication/${medId}/delete/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(res => {
        if (res.ok) {
            location.reload();
        } else {
            alert("Error deleting medication. Please try again.");
        }
    })
    .catch(error => console.error('Error:', error));
}