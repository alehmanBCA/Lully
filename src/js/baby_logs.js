/* static/js/baby_logs.js */

// Standard Django CSRF token retrieval from cookie
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

// Global quickLog function
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
            "X-CSRFToken": csrftoken // Use the CSRF token from the cookie
        },
        body: JSON.stringify({ type })
    })
    .then(() => {
        // Reload the page to show the updated data
        location.reload();
    })
    .catch(error => console.error('Error logging activity:', error));
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const timeline = document.getElementById("timeline");

    // Initialize the timeline if the element and API URL are present
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

                        // simple % positioning
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