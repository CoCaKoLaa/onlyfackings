// ONLYFACKINGS · admin-auth.js
// Login de administrador, sesiones seguras y baneo de usuarios.
// Requiere el binding D1 como env.DB y haber aplicado schema_admin.sql.
//
// En worker.js:
//   import { handleAdmin, getAdminSession, isBanned } from './admin-auth.js';
//   const a = await handleAdmin(request, env); if (a) return a;
//   const getUser = async (req, env) => (await getAdminSession(req, env)) || (await TU_getUser(req, env));
//   // y en tu función de sesión de usuarios: if (await isBanned(env, user.id)) return null;

const COOKIE = 'of_admin';
const SESSION_HOURS = 8;
const MAX_FAILS = 5;            // fallos por IP en la ventana
const WINDOW_MIN = 15;
const enc = new TextEncoder();

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
const now = () => new Date().toISOString();
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');

async function sha256Hex(text) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(text))); }

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

async function verifyPassword(password, stored) {
  try {
    const [alg, iter, saltB, hashB] = String(stored).split('$');
    if (alg !== 'pbkdf2') return false;
    const got = new Uint8Array(await pbkdf2(password, unb64(saltB), parseInt(iter, 10)));
    const exp = unb64(hashB);
    if (got.length !== exp.length) return false;
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got[i] ^ exp[i];
    return diff === 0;
  } catch { return false; }
}

// Hash falso para igualar tiempos cuando el correo no existe
const DUMMY = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

function getCookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? m[1] : null;
}
function sameOrigin(request) {
  const o = request.headers.get('origin');
  return !o || o === new URL(request.url).origin;
}
async function readJson(request) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) return null;
  try { return await request.json(); } catch { return null; }
}

// ---------- API pública del módulo ----------

export async function getAdminSession(request, env) {
  const token = getCookie(request, COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT a.id, a.email FROM admin_sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ? AND s.expires_at > ?'
  ).bind(await sha256Hex(token), now()).first();
  return row ? { id: row.id, email: row.email, role: 'admin' } : null;
}

export async function isBanned(env, userId) {
  const r = await env.DB.prepare(
    'SELECT 1 FROM user_bans WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?) LIMIT 1'
  ).bind(String(userId), now()).first();
  return !!r;
}

// ---------- Rutas ----------

export async function handleAdmin(request, env) {
  const url = new URL(request.url);
  const p = url.pathname;
  const m = request.method;
  const mine = ['/api/admin/login', '/api/admin/logout', '/api/admin/me', '/api/admin/users', '/api/admin/ban', '/api/admin/unban', '/api/admin/bans'];
  if (!mine.includes(p)) return null;

  if (m === 'POST' && p === '/api/admin/login') return login(request, env);

  const admin = await getAdminSession(request, env);
  if (!admin) return json({ error: 'No autenticado' }, 401);
  if (m !== 'GET' && !sameOrigin(request)) return json({ error: 'Origen no permitido' }, 403);

  if (m === 'GET' && p === '/api/admin/me') return json({ email: admin.email });
  if (m === 'POST' && p === '/api/admin/logout') return logout(request, env);
  if (m === 'GET' && p === '/api/admin/users') return listUsers(url, env);
  if (m === 'GET' && p === '/api/admin/bans') return listBans(env);
  if (m === 'POST' && p === '/api/admin/ban') return ban(request, env, admin);
  if (m === 'POST' && p === '/api/admin/unban') return unban(request, env, admin);
  return json({ error: 'No encontrado' }, 404);
}

async function login(request, env) {
  if (!sameOrigin(request)) return json({ error: 'Origen no permitido' }, 403);
  const ip = request.headers.get('cf-connecting-ip') || 'desconocida';
  const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();

  const f = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_login_attempts WHERE ip = ? AND at > ?').bind(ip, since).first();
  if (f.n >= MAX_FAILS) return json({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);

  const b = await readJson(request);
  const email = clean(b?.email, 200).toLowerCase();
  const password = String(b?.password ?? '').slice(0, 200);
  const adm = email ? await env.DB.prepare('SELECT id, password_hash FROM admins WHERE email = ?').bind(email).first() : null;
  const ok = await verifyPassword(password, adm ? adm.password_hash : DUMMY);

  if (!adm || !ok) {
    await env.DB.prepare('INSERT INTO admin_login_attempts (ip, at) VALUES (?, ?)').bind(ip, now()).run();
    return json({ error: 'Correo o contraseña incorrectos' }, 401);
  }

  const raw = crypto.getRandomValues(new Uint8Array(32));
  const token = hex(raw);
  const expires = new Date(Date.now() + SESSION_HOURS * 3600e3);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').bind(now()),
    env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip = ?').bind(ip),
    env.DB.prepare('INSERT INTO admin_sessions (token_hash, admin_id, created_at, expires_at) VALUES (?,?,?,?)')
      .bind(await sha256Hex(token), adm.id, now(), expires.toISOString()),
  ]);
  return json({ ok: true }, 200, {
    'set-cookie': `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}`,
  });
}

async function logout(request, env) {
  const token = getCookie(request, COOKIE);
  if (token) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` });
}

// ---------- Usuarios y baneos ----------
// Asume tu tabla users con columnas id y email. Quita automáticamente cualquier columna sensible.
const SENSITIVE = /pass|hash|salt|token|secret|code/i;

async function listUsers(url, env) {
  const q = clean(url.searchParams.get('q'), 100);
  const stmt = q
    ? env.DB.prepare('SELECT * FROM users WHERE email LIKE ? ORDER BY rowid DESC LIMIT 50').bind('%' + q.replace(/[%_]/g, '') + '%')
    : env.DB.prepare('SELECT * FROM users ORDER BY rowid DESC LIMIT 50');
  const { results } = await stmt.all();
  const bans = await env.DB.prepare('SELECT user_id FROM user_bans WHERE expires_at IS NULL OR expires_at > ?').bind(now()).all();
  const banned = new Set(bans.results.map((r) => String(r.user_id)));
  const items = results.map((u) => {
    const safe = {};
    for (const k of Object.keys(u)) if (!SENSITIVE.test(k)) safe[k] = u[k];
    safe.banned = banned.has(String(u.id));
    return safe;
  });
  return json({ items });
}

async function listBans(env) {
  const { results } = await env.DB.prepare('SELECT * FROM user_bans ORDER BY banned_at DESC LIMIT 200').all();
  return json({ items: results });
}

async function ban(request, env, admin) {
  const b = await readJson(request);
  const userId = clean(b?.user_id, 100);
  const reason = clean(b?.reason, 300);
  const days = Number.isFinite(+b?.days) && +b.days > 0 ? Math.min(+b.days, 3650) : null;
  if (!userId || !reason) return json({ error: 'Falta usuario o motivo' }, 400);
  const expires = days ? new Date(Date.now() + days * 864e5).toISOString() : null;
  await env.DB.prepare(
    'INSERT OR REPLACE INTO user_bans (user_id, reason, banned_by, banned_at, expires_at) VALUES (?,?,?,?,?)'
  ).bind(userId, reason, admin.id, now(), expires).run();
  await auditSafe(env, admin.id, 'user.ban', userId, { reason, days });
  return json({ ok: true });
}

async function unban(request, env, admin) {
  const b = await readJson(request);
  const userId = clean(b?.user_id, 100);
  if (!userId) return json({ error: 'Falta usuario' }, 400);
  await env.DB.prepare('DELETE FROM user_bans WHERE user_id = ?').bind(userId).run();
  await auditSafe(env, admin.id, 'user.unban', userId, null);
  return json({ ok: true });
}

// audit_log viene de schema_cumplimiento.sql; si no está aplicado no rompe el baneo
async function auditSafe(env, actor, action, target, meta) {
  try {
    await env.DB.prepare('INSERT INTO audit_log (actor_id, action, target_type, target_id, meta, created_at) VALUES (?,?,?,?,?,?)')
      .bind(actor, action, 'user', target, meta ? JSON.stringify(meta) : null, now()).run();
  } catch {}
}
