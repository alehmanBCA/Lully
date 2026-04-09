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