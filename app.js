(() => {
  const gate = document.getElementById('age-gate');
  const shell = document.getElementById('site-shell');
  const accepted = localStorage.getItem('of_age_confirmed') === 'yes';
  if (accepted) unlockSite();
  function unlockSite() {
    gate.classList.add('is-hidden');
    shell.classList.remove('is-locked');
    shell.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => { gate.hidden = true; }, 280);
  }
  document.getElementById('age-yes').addEventListener('click', () => {
    localStorage.setItem('of_age_confirmed', 'yes');
    unlockSite();
  });
  document.getElementById('age-no').addEventListener('click', () => {
    gate.innerHTML = '<div class="age-card"><div class="age-mark">OF</div><p class="eyebrow">ACCESO RESTRINGIDO</p><h1>No puedes acceder</h1><p class="age-copy">ONLYFACKINGS está dirigido a personas adultas. Puedes cerrar esta ventana.</p></div>';
  });
  const modal = document.getElementById('modal-backdrop');
  const title = document.getElementById('modal-title');
  const message = document.getElementById('modal-message');
  document.querySelectorAll('[data-modal]').forEach((button) => button.addEventListener('click', () => {
    const kind = button.dataset.modal;
    if (kind === 'profile') {
      title.textContent = button.dataset.profile || 'Perfil de muestra';
      message.textContent = 'Este perfil es ficticio y forma parte de la maqueta. Los perfiles reales aparecerán cuando la plataforma esté configurada.';
    } else if (kind === 'login') {
      title.textContent = 'Inicio de sesión';
      message.textContent = 'La creación de cuentas todavía no está conectada. Esta página es una demostración visual.';
    } else {
      title.textContent = 'Únete a ONLYFACKINGS';
      message.textContent = 'El registro, las suscripciones y los pagos aún no están configurados. Para activarlos se necesita una plataforma segura de cuentas y cobros.';
    }
    modal.hidden = false;
    document.getElementById('modal-ok').focus();
  }));
  const closeModal = () => { modal.hidden = true; };
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-ok').addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  let activeFilter = 'todos';
  const search = document.getElementById('creator-search');
  const cards = [...document.querySelectorAll('.creator-card')];
  const empty = document.getElementById('empty-state');
  function filterCards() {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    cards.forEach((card) => {
      const show = (activeFilter === 'todos' || card.dataset.category === activeFilter) &&
        (!query || card.dataset.name.includes(query) || card.textContent.toLowerCase().includes(query));
      card.hidden = !show;
      if (show) count += 1;
    });
    empty.hidden = count > 0;
  }
  document.querySelectorAll('.filter-chip').forEach((chip) => chip.addEventListener('click', () => {
    document.querySelector('.filter-chip.is-active')?.classList.remove('is-active');
    chip.classList.add('is-active');
    activeFilter = chip.dataset.filter;
    filterCards();
  }));
  search.addEventListener('input', filterCards);
  const menuButton = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  menuButton.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    mobileMenu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  }));
  document.getElementById('year').textContent = new Date().getFullYear();
})();
