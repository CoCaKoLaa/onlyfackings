(() => {
  const gate = document.getElementById('age-gate');
  const shell = document.getElementById('site-shell');
  const accepted = localStorage.getItem('of_age_confirmed') === 'yes';
  if (accepted) unlockSite();
  function unlockSite() {
    gate.classList.add('is-hidden');
    shell.classList.remove('is-locked');
    shell.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => { gate.hidden = true; if (!readCookieChoice()) openCookieBanner(); }, 280);
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
  const authForm = document.getElementById('auth-form');
  const authStatus = document.getElementById('auth-status');
  const authSubmit = document.getElementById('auth-submit');
  const termsWrap = document.getElementById('auth-terms-wrap');
  const termsCheck = document.getElementById('auth-terms');
  const authSwitch = document.getElementById('auth-switch');
  const modalOk = document.getElementById('modal-ok');
  let authMode = 'register';
  function configureAuth(mode) {
    authMode = mode;
    modalOk.textContent = 'Entendido';
    title.textContent = mode === 'login' ? 'Inicia sesión' : 'Crear cuenta';
    message.textContent = mode === 'login' ? 'Accede a tu cuenta verificada.' : 'Te enviaremos un correo para verificar la cuenta. La contraseña debe tener al menos 12 caracteres.';
    authForm.hidden = false;
    authStatus.textContent = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    termsWrap.hidden = mode === 'login';
    termsCheck.required = mode === 'register';
    termsCheck.checked = false;
    authSubmit.textContent = mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
    authSwitch.hidden = false;
    authSwitch.textContent = mode === 'login' ? 'Crear una cuenta' : 'Ya tengo cuenta';
    modalOk.hidden = true;
    modal.hidden = false;
    document.getElementById('auth-email').focus();
  }
  document.querySelectorAll('[data-modal]').forEach((button) => button.addEventListener('click', () => {
    const kind = button.dataset.modal;
    if (kind === 'login' || kind === 'join') { configureAuth(kind === 'login' ? 'login' : 'register'); return; }
    authForm.hidden = true;
    authSwitch.hidden = true;
    modalOk.hidden = false;
    title.textContent = button.dataset.profile || 'Perfil de muestra';
    message.textContent = 'Este perfil es ficticio y forma parte de la maqueta. Los perfiles reales aparecerán cuando la plataforma esté configurada.';
    modal.hidden = false;
    modalOk.focus();
  }));
  authSwitch.addEventListener('click', () => configureAuth(authMode === 'login' ? 'register' : 'login'));
  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    authStatus.textContent = 'Procesando…';
    authSubmit.disabled = true;
    const payload = { email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value };
    if (authMode === 'register') payload.termsAccepted = termsCheck.checked;
    try {
      const response = await fetch(authMode === 'login' ? '/api/login' : '/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
      if (authMode === 'register') {
        authStatus.textContent = result.message;
        authForm.reset();
      } else {
        authStatus.textContent = `Sesión iniciada: ${result.user.email}${result.user.role === 'admin' ? ' · Administrador' : ''}`;
        authForm.hidden = true;
        authSwitch.hidden = true;
        modalOk.hidden = false;
        modalOk.textContent = 'Continuar';
      }
    } catch (error) { authStatus.textContent = error.message || 'No se pudo conectar con el servicio.'; }
    finally { authSubmit.disabled = false; }
  });  const closeModal = () => { modal.hidden = true; };
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
  const cookieBanner = document.getElementById('cookie-banner');
  const cookieKey = 'of_cookie_preferences_v1';
  const readCookieChoice = () => { try { return JSON.parse(localStorage.getItem(cookieKey) || 'null'); } catch { return null; } };
  const openCookieBanner = () => { cookieBanner.hidden = false; };
  const saveCookieChoice = (analytics) => {
    localStorage.setItem(cookieKey, JSON.stringify({ necessary: true, analytics: Boolean(analytics), updatedAt: new Date().toISOString() }));
    cookieBanner.hidden = true;
  };
  document.getElementById('cookie-accept').addEventListener('click', () => saveCookieChoice(true));
  document.getElementById('cookie-reject').addEventListener('click', () => saveCookieChoice(false));
  const cookiePreferences = document.getElementById('cookie-preferences');
  const cookieAnalytics = document.getElementById('cookie-analytics');
  document.getElementById('cookie-settings').addEventListener('click', () => {
    cookieAnalytics.checked = Boolean(readCookieChoice()?.analytics);
    cookiePreferences.hidden = false;
    document.getElementById('cookie-save').focus();
  });
  document.getElementById('cookie-save').addEventListener('click', () => saveCookieChoice(cookieAnalytics.checked));
  document.getElementById('footer-cookie-settings').addEventListener('click', openCookieBanner);
  document.getElementById('year').textContent = new Date().getFullYear();
})();

  fetch('/api/me', { credentials: 'same-origin' }).then((response) => response.ok ? response.json() : null).then((data) => { if (data?.user?.role === 'admin') document.getElementById('admin-link').hidden = false; }).catch(() => {});
