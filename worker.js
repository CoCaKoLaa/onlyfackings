const encoder = new TextEncoder();
const SESSION_COOKIE = '__Host-of_session';
const SESSION_SECONDS = 60 * 60 * 24 * 14;
const VERIFY_SECONDS = 60 * 60 * 24;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
function html(body, status = 200) {
  return new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ONLYFACKINGS</title><body style="font:16px system-ui;max-width:620px;margin:12vh auto;padding:24px;color:#211d24"><h1>${body}</h1><p>Ya puedes cerrar esta ventana y volver a ONLYFACKINGS.</p><p><a href="/">Volver a la web</a></p></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return [...data].map((v) => v.toString(16).padStart(2, '0')).join('');
}
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
async function passwordHash(password, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g), (v) => parseInt(v, 16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 310000 }, key, 256);
  return [...new Uint8Array(bits)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
function cookieValue(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const item = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}
function cookieHeader(value, maxAge) {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
}
async function bodyJson(request) {
  try { return await request.json(); } catch { return null; }
}
function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return origin && origin === new URL(request.url).origin;
}
async function sendVerification(env, email, token) {
  if (!env.EMAIL || !env.EMAIL_FROM || !env.PUBLIC_BASE_URL) throw new Error('Cloudflare Email Service is not configured');
  const link = `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/verify?token=${token}`;
  await env.EMAIL.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Confirma tu correo de ONLYFACKINGS',
    text: `Confirma tu correo en las próximas 24 horas abriendo este enlace: ${link}\n\nSi no solicitaste esta cuenta, ignora este mensaje.`
  });
}async function sessionUser(request, env) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare('SELECT users.id, users.email, users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>? AND users.email_verified_at IS NOT NULL').bind(tokenHash, Math.floor(Date.now() / 1000)).first();
  return row || null;
}
async function newSession(userId, env) {
  const token = randomToken();
  const now = new Date().toISOString();
  await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(await sha256(token), userId, Math.floor(Date.now() / 1000) + SESSION_SECONDS, now).run();
  return token;
}
async function handleApi(request, env, url) {
  const path = url.pathname;
  if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'Solicitud de origen no válido.' }, 403);

  if (path === '/api/register' && request.method === 'POST') {
    const data = await bodyJson(request);
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
    const password = data?.password;
    if (!validEmail(email) || typeof password !== 'string' || password.length < 12 || password.length > 128 || data?.termsAccepted !== true) return json({ error: 'Introduce un correo válido, una contraseña de al menos 12 caracteres y acepta las condiciones.' }, 400);
    const existing = await env.DB.prepare('SELECT id,email_verified_at FROM users WHERE email=?').bind(email).first();
    if (existing?.email_verified_at) return json({ error: 'No se pudo crear la cuenta. Si ya tienes una, inicia sesión o restablece la contraseña.' }, 409);
    const userId = existing?.id || crypto.randomUUID();
    const salt = randomToken(16);
    const hash = await passwordHash(password, salt);
    const now = new Date().toISOString();
    if (existing) await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,terms_accepted_at=?,terms_version=? WHERE id=?').bind(hash, salt, now, env.TERMS_VERSION || 'draft-1', userId).run();
    else await env.DB.prepare("INSERT INTO users (id,email,password_hash,password_salt,role,terms_accepted_at,terms_version,created_at) VALUES (?,?,?,? ,'fan',?,?,?)").bind(userId, email, hash, salt, now, env.TERMS_VERSION || 'draft-1', now).run();
    await env.DB.prepare('DELETE FROM email_verifications WHERE user_id=?').bind(userId).run();
    const token = randomToken();
    await env.DB.prepare('INSERT INTO email_verifications (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(await sha256(token), userId, Math.floor(Date.now() / 1000) + VERIFY_SECONDS, now).run();
    try { await sendVerification(env, email, token); } catch { return json({ error: 'La cuenta quedó pendiente, pero no pudimos enviar el correo. Revisa la configuración de correo e inténtalo de nuevo.' }, 503); }
    return json({ message: 'Te enviamos un enlace para verificar el correo. Caduca en 24 horas.' }, 202);
  }

  if (path === '/api/verify' && request.method === 'GET') {
    const token = url.searchParams.get('token') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) return html('El enlace no es válido o ya caducó.', 400);
    const tokenHash = await sha256(token);
    const row = await env.DB.prepare('SELECT users.id,users.email,email_verifications.expires_at FROM email_verifications JOIN users ON users.id=email_verifications.user_id WHERE email_verifications.token_hash=?').bind(tokenHash).first();
    if (!row || row.expires_at < Math.floor(Date.now() / 1000)) return html('El enlace no es válido o ya caducó.', 400);
    const role = env.ADMIN_EMAIL && row.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'fan';
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE users SET email_verified_at=?,role=? WHERE id=?').bind(now, role, row.id).run();
    await env.DB.prepare('DELETE FROM email_verifications WHERE user_id=?').bind(row.id).run();
    const session = await newSession(row.id, env);
    return new Response(null, { status: 302, headers: { location: '/?verified=1', 'set-cookie': cookieHeader(session, SESSION_SECONDS), 'cache-control': 'no-store' } });
  }

  if (path === '/api/login' && request.method === 'POST') {
    const data = await bodyJson(request);
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
    const password = typeof data?.password === 'string' ? data.password : '';
    if (!validEmail(email) || !password) return json({ error: 'Correo o contraseña incorrectos.' }, 400);
    const user = await env.DB.prepare('SELECT id,email,password_hash,password_salt,email_verified_at,role FROM users WHERE email=?').bind(email).first();
    const calculated = user ? await passwordHash(password, user.password_salt) : await passwordHash(password, '00112233445566778899aabbccddeeff');
    if (!user || calculated !== user.password_hash) return json({ error: 'Correo o contraseña incorrectos.' }, 401);
    if (!user.email_verified_at) return json({ error: 'Confirma primero el correo desde el enlace que te enviamos.' }, 403);
    const session = await newSession(user.id, env);
    return json({ user: { email: user.email, role: user.role } }, 200, { 'set-cookie': cookieHeader(session, SESSION_SECONDS) });
  }

  if (path === '/api/logout' && request.method === 'POST') {
    const token = cookieValue(request, SESSION_COOKIE);
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(token)).run();
    return json({ message: 'Sesión cerrada.' }, 200, { 'set-cookie': cookieHeader('', 0) });
  }

  if (path === '/api/me' && request.method === 'GET') {
    const user = await sessionUser(request, env);
    return user ? json({ user }) : json({ user: null }, 401);
  }

  if (path === '/api/admin/summary' && request.method === 'GET') {
    const user = await sessionUser(request, env);
    if (!user || user.role !== 'admin') return json({ error: 'Acceso denegado.' }, 403);
    const counts = await env.DB.prepare("SELECT role,COUNT(*) AS total FROM users GROUP BY role").all();
    return json({ user, counts: counts.results || [] });
  }

  if (path.startsWith('/api/subscriptions')) return json({ error: 'Los cobros todavía no están habilitados: falta aprobación del proveedor y configurar su integración.' }, 503);
  return json({ error: 'No encontrado.' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await handleApi(request, env, url); }
      catch (error) { console.error('API request failed', error?.message || 'unknown'); return json({ error: 'Error temporal del servicio.' }, 500); }
    }
    return env.ASSETS.fetch(request);
  }
};
