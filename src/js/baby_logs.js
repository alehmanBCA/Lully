
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

document.getElementById('start-timer')?.addEventListener('click', () => {
    const startBtn = document.getElementById('start-timer');
    const stopBtn = document.getElementById('stop-timer');
    
    startBtn.disabled = true;
    stopBtn.disabled = false;

    timerInterval = setInterval(() => {
        secondsElapsed++;
        const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
        const secs = String(secondsElapsed % 60).padStart(2, '0');
        document.getElementById('timer-display').textContent = `${mins}:${secs}`;
    }, 1000);
});

document.getElementById('stop-timer')?.addEventListener('click', () => {
    clearInterval(timerInterval);
    document.getElementById('start-timer').disabled = false;
    document.getElementById('stop-timer').disabled = true;
});

function saveFeeding(babyId) {
    const duration = Math.round(secondsElapsed / 60);
    const side = document.getElementById('feeding-side').value;

    fetch(`/api/baby/${babyId}/feeding/save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ duration, side })
    }).then(res => {
        if (res.ok) {
            location.reload();
        } else {
            console.error('Failed to save feeding data');
        }
    });
}

let selectedDiaperType = 'Both';

function setDiaperType(type, element) {
    selectedDiaperType = type;
    document.querySelectorAll('.diaper-type-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
}

function saveDetailedDiaper(babyId) {
    const timeInput = document.getElementById('diaper-time').value;
    const time = timeInput ? timeInput : new Date().toISOString().slice(0, 16);
    const type = selectedDiaperType;

    fetch(`/api/baby/${babyId}/diaper/detailed-save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ time, type })
    }).then(res => {
        if (res.ok) {
            location.reload();
        } else {
            alert('Failed to save diaper log');
        }
    });
}

function setDefaultSleepTime() {
    const timeInput = document.getElementById('sleep-start-time');
    if (timeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        timeInput.value = now.toISOString().slice(0, 16);
    }
}

document.getElementById('start-sleep-timer')?.addEventListener('click', () => {
    document.getElementById('start-sleep-timer').disabled = true;
    document.getElementById('stop-sleep-timer').disabled = false;
    
    sleepTimerInterval = setInterval(() => {
        sleepSecondsElapsed++;
        const mins = String(Math.floor(sleepSecondsElapsed / 60)).padStart(2, '0');
        const secs = String(sleepSecondsElapsed % 60).padStart(2, '0');
        document.getElementById('sleep-timer-display').textContent = `${mins}:${secs}`;
    }, 1000);
});

document.getElementById('stop-sleep-timer')?.addEventListener('click', () => {
    clearInterval(sleepTimerInterval);
    document.getElementById('start-sleep-timer').disabled = false;
    document.getElementById('stop-sleep-timer').disabled = true;
});

function setSleepPosition(position, element) {
    selectedSleepPosition = position;
    const parent = element.closest('.diaper-type-selector');
    parent.querySelectorAll('.diaper-type-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
}

function saveDetailedSleep(babyId) {
    const time = document.getElementById('sleep-start-time').value;
    const duration = Math.round(sleepSecondsElapsed / 60);
    const position = selectedSleepPosition;

    fetch(`/api/baby/${babyId}/sleep/detailed-save/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ time, duration, position })
    }).then(res => {
        if (res.ok) location.reload();
    });
}