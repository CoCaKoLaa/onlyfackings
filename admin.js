// ONLYFACKINGS · admin.js (panel). Todo el texto se inserta con textContent (sin innerHTML).
const $ = (s) => document.querySelector(s);

async function api(path, body) {
  const opt = { credentials: 'same-origin', headers: { 'content-type': 'application/json' } };
  if (body !== undefined) { opt.method = 'POST'; opt.body = JSON.stringify(body); }
  const r = await fetch(path, opt);
  let d = {};
  try { d = await r.json(); } catch {}
  if (!r.ok) throw new Error(d.error || 'Error ' + r.status);
  return d;
}
function el(tag, text, attrs) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (attrs) for (const k in attrs) e[k] = attrs[k];
  return e;
}
function table(heads, rows) {
  const wrap = el('div', null, { className: 'tablewrap' });
  const t = el('table'); const tr = el('tr');
  heads.forEach((h) => tr.append(el('th', h)));
  t.append(tr);
  rows.forEach((cells) => {
    const r = el('tr');
    cells.forEach((c) => { const td = el('td'); td.append(c instanceof Node ? c : document.createTextNode(c ?? '')); r.append(td); });
    t.append(r);
  });
  wrap.append(t);
  if (!rows.length) wrap.append(el('p', 'Sin resultados.'));
  return wrap;
}
function btn(text, fn) { const b = el('button', text, { className: 'btn small ghost', type: 'button' }); b.onclick = fn; return b; }
const fecha = (s) => (s ? String(s).slice(0, 16).replace('T', ' ') : '');
const fail = (e) => { $('#perr').textContent = e.message; };

const vistas = {
  async usuarios() {
    const box = el('div');
    const q = el('input', null, { placeholder: 'Buscar por correo', type: 'search' });
    const go = btn('Buscar', () => cargar());
    const out = el('div');
    box.append(q, ' ', go, out);
    async function cargar() {
      const d = await api('/api/admin/users?q=' + encodeURIComponent(q.value));
      out.replaceChildren(table(['ID', 'Correo', 'Alta', 'Estado', ''], d.items.map((u) => [
        String(u.id), u.email || '', fecha(u.created_at),
        u.banned ? el('span', 'Baneado', { className: 'tag' }) : 'Activo',
        u.banned
          ? btn('Quitar ban', async () => { await api('/api/admin/unban', { user_id: String(u.id) }); cargar(); })
          : btn('Banear', async () => {
              const reason = prompt('Motivo del ban (obligatorio):'); if (!reason) return;
              const days = prompt('Días de ban (vacío = permanente):');
              await api('/api/admin/ban', { user_id: String(u.id), reason, days: days ? Number(days) : null });
              cargar();
            }),
      ])));
    }
    await cargar();
    return box;
  },
  async denuncias() {
    const d = await api('/api/admin/reports?status=open');
    const act = (r, status, label) => btn(label, async () => {
      const resolution = prompt('Motivo de la decisión:'); if (!resolution) return;
      await api('/api/admin/reports/resolve', { id: r.id, status, resolution }); show('denuncias');
    });
    return table(['Fecha', 'Tipo', 'ID objetivo', 'Motivo', 'Detalle', ''], d.items.map((r) => [
      fecha(r.created_at), r.target_type, r.target_id,
      r.priority ? el('span', r.reason, { className: 'tag' }) : r.reason, r.details || '',
      (() => { const s = el('span'); s.append(act(r, 'removed', 'Retirar'), ' ', act(r, 'dismissed', 'Descartar')); return s; })(),
    ]));
  },
  async kyc() {
    const d = await api('/api/admin/kyc?status=pending');
    const act = (k, decision, label) => btn(label, async () => {
      const reason = decision === 'approved' ? '' : prompt('Motivo:'); if (decision !== 'approved' && !reason) return;
      await api('/api/admin/kyc/decision', { id: k.id, decision, reason }); show('kyc');
    });
    return table(['Fecha', 'Usuario', 'Nombre legal', 'País', 'Proveedor', ''], d.items.map((k) => [
      fecha(k.created_at), k.user_id, k.legal_name, k.country, k.provider,
      (() => { const s = el('span'); s.append(act(k, 'approved', 'Aprobar'), ' ', act(k, 'rejected', 'Rechazar')); return s; })(),
    ]));
  },
  async baneados() {
    const d = await api('/api/admin/bans');
    return table(['Usuario', 'Motivo', 'Desde', 'Hasta', ''], d.items.map((b) => [
      b.user_id, b.reason, fecha(b.banned_at), b.expires_at ? fecha(b.expires_at) : 'Permanente',
      btn('Quitar ban', async () => { await api('/api/admin/unban', { user_id: b.user_id }); show('baneados'); }),
    ]));
  },
};

async function show(name) {
  $('#perr').textContent = '';
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === name));
  try { $('#vista').replaceChildren(await vistas[name]()); } catch (e) { fail(e); }
}

async function entrarPanel(email) {
  $('#login').hidden = true; $('#panel').hidden = false;
  $('#salir').hidden = false; $('#quien').textContent = email + ' ';
  show('usuarios');
}

document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => show(b.dataset.t)));
$('#salir').onclick = async () => { try { await api('/api/admin/logout', {}); } catch {} location.reload(); };
$('#entrar').onclick = async () => {
  $('#lerr').textContent = '';
  try {
    await api('/api/admin/login', { email: $('#em').value, password: $('#pw').value });
    $('#pw').value = '';
    const me = await api('/api/admin/me');
    entrarPanel(me.email);
  } catch (e) { $('#lerr').textContent = e.message; }
};
$('#pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#entrar').click(); });

(async () => { try { const me = await api('/api/admin/me'); entrarPanel(me.email); } catch {} })();
