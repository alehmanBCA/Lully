document.addEventListener('DOMContentLoaded', () => {
  // document.querySelectorAll('.delete').forEach(btn => {
  //   btn.addEventListener('click', (e) => {
  //     const card = e.target.closest('.card');
  //     if(!card) return;
  //     card.remove();
  //   });
  // });

  // document.querySelectorAll('.delete').forEach(btn => {
  //   btn.addEventListener('click', (e) => {
  //     const card = e.target.closest('.article');
  //     if(card) card.remove();
  //   });
  // });
});


// Angel's stuff
function toggleModal(show) {
    const modal = document.getElementById('addBabyModal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('addBabyModal');
    if (event.target == modal) {
        toggleModal(false);
    }
};

// Poll vitals for each baby on the Profile page so the server records
// readings and can issue notifications even when the user is not on a
// monitor page. This will call /api/baby/<id>/vitals/ at a configurable
// interval (in ms). Keep interval conservative to avoid excess load.
function startProfilePolling(intervalMs = 8000) {
    const cards = document.querySelectorAll('article.card[data-baby-id]');
    if (!cards || cards.length === 0) return;

    async function pollOnce() {
        cards.forEach(async (card) => {
            const id = card.getAttribute('data-baby-id');
            if (!id) return;
            try {
                // Fire-and-forget — server will save reading and trigger alerts
                await fetch(`/api/baby/${id}/vitals/`, { cache: 'no-store' });
            } catch (err) {
                // ignore network errors; we don't want the profile page to break
                console.error('Failed to poll vitals for baby', id, err);
            }
        });
    }

    // Start immediately and then at interval
    pollOnce();
    setInterval(pollOnce, intervalMs);
}

document.addEventListener('DOMContentLoaded', () => {
    // Start polling (every 8s by default)
    startProfilePolling(8000);
});