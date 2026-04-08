document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if(!card) return;
      card.remove();
    });
  });

  document.querySelectorAll('.view').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const card = e.target.closest('.card');
      const name = card ? card.querySelector('.name').textContent : 'baby';
      alert(`Open monitor for ${name} (implement route)`);
    });
  });

  const addBtn = document.querySelector('.btn.add');
  if(addBtn){
    addBtn.addEventListener('click', () => {
      alert('Add Baby Profile — implement creation flow');
    });
  }
});
