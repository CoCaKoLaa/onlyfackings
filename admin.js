(async () => {
  const status = document.getElementById('admin-status');
  try {
    const response = await fetch('/api/admin/summary', { credentials: 'same-origin' });
    if (!response.ok) { status.textContent = 'Inicia sesión con la cuenta administradora verificada para acceder.'; return; }
    const data = await response.json();
    document.getElementById('admin-email').textContent = data.user.email;
    const list = document.getElementById('admin-counts');
    for (const row of data.counts) {
      const item = document.createElement('li');
      item.textContent = `${row.role}: ${row.total}`;
      list.append(item);
    }
    document.getElementById('admin-panel').hidden = false;
    status.textContent = 'Panel inicial activo.';
  } catch {
    status.textContent = 'No se pudo conectar con el servidor de administración.';
  }
  document.getElementById('admin-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    location.href = '/';
  });
})();
