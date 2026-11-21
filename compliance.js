// ONLYFACKINGS · compliance.js
// Módulo de cumplimiento: edad, KYC de creadores, denuncias y consentimientos.
//
// Uso en worker.js (ver instrucciones en el chat):
//   import { handleCompliance } from './compliance.js';
//   const res = await handleCompliance(request, env, getUser);
//   if (res) return res;
//
// getUser(request, env) debe devolver { id, email, role } o null.
// Requiere el binding D1 como env.DB (cámbialo abajo si tu binding se llama distinto).
// Secreto: wrangler secret put KYC_WEBHOOK_SECRET

const PROVIDERS = ['veriff', 'onfido', 'stripe_identity', 'manual'];
const REPORT_TARGETS = ['post', 'profile', 'message', 'comment'];
const REPORT_REASONS = ['menor', 'sin_consentimiento', 'ilegal', 'suplantacion', 'violencia', 'spam', 'otro'];
const URGENT_REASONS = ['menor', 'sin_consentimiento'];
const AGE_VALID_DAYS = 365;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const now = () => new Date().toISOString();
const addDays = (d) => new Date(Date.now() + d * 864e5).toISOString();
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

async function audit(env, actorId, action, targetType, targetId, meta) {
  await env.DB.prepare(
    'INSERT INTO audit_log (actor_id, action, target_type, target_id, meta, created_at) VALUES (?,?,?,?,?,?)'
  ).bind(actorId ?? null, action, targetType ?? null, targetId ?? null, meta ? JSON.stringify(meta) : null, now()).run();
}

// ---------- Puertas de acceso: úsalas en el resto de endpoints ----------

export async function isAdultVerified(env, userId) {
  const r = await env.DB.prepare(
    "SELECT 1 FROM age_verifications WHERE user_id=? AND status='verified' AND (expires_at IS NULL OR expires_at > ?) LIMIT 1"
  ).bind(userId, now()).first();
  return !!r;
}

export async function isCreatorVerified(env, userId) {
  const r = await env.DB.prepare(
    "SELECT 1 FROM creator_kyc WHERE user_id=? AND status='approved' LIMIT 1"
  ).bind(userId).first();
  return !!r;
}

// ---------- Firma de webhooks (HMAC-SHA256 en hex) ----------

async function verifySignature(secret, rawBody, signatureHex) {
  if (!secret || !signatureHex || !/^[0-9a-f]+$/i.test(signatureHex) || signatureHex.length % 2) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const sig = new Uint8Array(signatureHex.match(/../g).map((h) => parseInt(h, 16)));
  return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(rawBody)); // comparación en tiempo constante
}

// ---------- Integración con el proveedor (PUNTO A COMPLETAR) ----------
// Aquí crearías la sesión real en Veriff/Onfido/Stripe Identity y devolverías
// su id y la URL a la que mandar al usuario. Mientras tanto devuelve una referencia local.
async function createProviderSession(env, provider, kind, user) {
  const ref = crypto.randomUUID();
  // TODO: llamada a la API del proveedor. Ejemplo de resultado esperado:
  // return { ref: session.id, url: session.url };
  return { ref, url: null };
}

// ---------- Router ----------

export async function handleCompliance(request, env, getUser) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const isMine = path.startsWith('/api/compliance/') || path.startsWith('/api/reports') || path.startsWith('/api/admin/kyc') || path.startsWith('/api/admin/reports');
  if (!isMine) return null;

  // Webhook del proveedor: sin sesión, con firma
  if (method === 'POST' && path === '/api/compliance/webhook') return webhook(request, env);

  const user = await getUser(request, env);
  const isAdmin = user?.role === 'admin';

  // Denuncias: se permite denunciar sin cuenta (DSA), con límite si hay cuenta
  if (method === 'POST' && path === '/api/reports') return createReport(request, env, user);

  if (!user) return json({ error: 'No autenticado' }, 401);

  if (method === 'GET' && path === '/api/compliance/status') {
    return json({
      adult_verified: await isAdultVerified(env, user.id),
      creator_verified: await isCreatorVerified(env, user.id),
    });
  }
  if (method === 'POST' && path === '/api/compliance/age/start') return startAge(request, env, user);
  if (method === 'POST' && path === '/api/compliance/kyc/start') return startKyc(request, env, user);
  if (method === 'POST' && path === '/api/compliance/consent') return addConsent(request, env, user);

  // Panel admin
  if (path.startsWith('/api/admin/')) {
    if (!isAdmin) return json({ error: 'Prohibido' }, 403);
    if (method === 'GET' && path === '/api/admin/kyc') return listKyc(url, env);
    if (method === 'POST' && path === '/api/admin/kyc/decision') return decideKyc(request, env, user);
    if (method === 'GET' && path === '/api/admin/reports') return listReports(url, env);
    if (method === 'POST' && path === '/api/admin/reports/resolve') return resolveReport(request, env, user);
  }

  return json({ error: 'No encontrado' }, 404);
}

// ---------- Edad ----------

async function startAge(request, env, user) {
  if (await isAdultVerified(env, user.id)) return json({ ok: true, status: 'verified' });
  const body = (await readJson(request)) || {};
  const provider = PROVIDERS.includes(body.provider) ? body.provider : 'veriff';

  const pending = await env.DB.prepare(
    "SELECT provider_ref FROM age_verifications WHERE user_id=? AND status='pending' LIMIT 1"
  ).bind(user.id).first();
  if (pending) return json({ ok: true, status: 'pending', provider_ref: pending.provider_ref });

  const session = await createProviderSession(env, provider, 'age', user);
  await env.DB.prepare(
    'INSERT INTO age_verifications (id, user_id, status, method, provider_ref, created_at) VALUES (?,?,?,?,?,?)'
  ).bind(crypto.randomUUID(), user.id, 'pending', provider, session.ref, now()).run();
  await audit(env, user.id, 'age.start', 'user', user.id, { provider });
  return json({ ok: true, status: 'pending', provider_ref: session.ref, redirect_url: session.url });
}

// ---------- KYC de creadores ----------

async function startKyc(request, env, user) {
  if (!(await isAdultVerified(env, user.id))) return json({ error: 'Verifica primero tu edad' }, 403);
  const body = await readJson(request);
  if (!body) return json({ error: 'JSON inválido' }, 400);

  const legalName = clean(body.legal_name, 120);
  const country = clean(body.country, 2).toUpperCase();
  const provider = PROVIDERS.includes(body.provider) ? body.provider : 'veriff';
  if (legalName.length < 3 || !/^[A-Z]{2}$/.test(country)) return json({ error: 'Datos incompletos' }, 400);

  const existing = await env.DB.prepare(
    "SELECT status, provider_ref FROM creator_kyc WHERE user_id=? AND status IN ('pending','approved') LIMIT 1"
  ).bind(user.id).first();
  if (existing) return json({ ok: true, status: existing.status, provider_ref: existing.provider_ref });

  const session = await createProviderSession(env, provider, 'kyc', user);
  await env.DB.prepare(
    'INSERT INTO creator_kyc (id, user_id, status, provider, provider_ref, legal_name, country, created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(crypto.randomUUID(), user.id, 'pending', provider, session.ref, legalName, country, now()).run();
  await audit(env, user.id, 'kyc.start', 'user', user.id, { provider, country });
  return json({ ok: true, status: 'pending', provider_ref: session.ref, redirect_url: session.url });
}

async function webhook(request, env) {
  const raw = await request.text();
  const ok = await verifySignature(env.KYC_WEBHOOK_SECRET, raw, request.headers.get('x-signature'));
  if (!ok) return json({ error: 'Firma inválida' }, 401);

  let evt;
  try { evt = JSON.parse(raw); } catch { return json({ error: 'JSON inválido' }, 400); }
  // Formato genérico. Adáptalo al payload real de tu proveedor:
  // { type: 'age' | 'kyc', provider_ref: '...', status: 'verified' | 'rejected', reason?: '...' }
  const ref = clean(evt.provider_ref, 200);
  const approved = evt.status === 'verified' || evt.status === 'approved';
  if (!ref) return json({ error: 'Falta provider_ref' }, 400);

  if (evt.type === 'age') {
    await env.DB.prepare(
      'UPDATE age_verifications SET status=?, verified_at=?, expires_at=? WHERE provider_ref=?'
    ).bind(approved ? 'verified' : 'rejected', approved ? now() : null, approved ? addDays(AGE_VALID_DAYS) : null, ref).run();
  } else if (evt.type === 'kyc') {
    await env.DB.prepare(
      'UPDATE creator_kyc SET status=?, reviewed_at=?, reject_reason=? WHERE provider_ref=?'
    ).bind(approved ? 'approved' : 'rejected', now(), approved ? null : clean(evt.reason, 300), ref).run();
  } else {
    return json({ error: 'Tipo desconocido' }, 400);
  }
  await audit(env, null, `${evt.type}.webhook`, 'provider_ref', ref, { approved });
  return json({ ok: true });
}

async function listKyc(url, env) {
  const status = ['pending', 'approved', 'rejected', 'revoked'].includes(url.searchParams.get('status'))
    ? url.searchParams.get('status') : 'pending';
  const { results } = await env.DB.prepare(
    'SELECT id, user_id, status, provider, legal_name, country, created_at FROM creator_kyc WHERE status=? ORDER BY created_at LIMIT 100'
  ).bind(status).all();
  return json({ items: results });
}

async function decideKyc(request, env, admin) {
  const b = await readJson(request);
  if (!b || !['approved', 'rejected', 'revoked'].includes(b.decision)) return json({ error: 'Decisión inválida' }, 400);
  const reason = clean(b.reason, 300);
  if (b.decision !== 'approved' && !reason) return json({ error: 'Indica el motivo' }, 400);
  const r = await env.DB.prepare(
    'UPDATE creator_kyc SET status=?, reviewed_at=?, reviewed_by=?, reject_reason=? WHERE id=?'
  ).bind(b.decision, now(), admin.id, b.decision === 'approved' ? null : reason, clean(b.id, 64)).run();
  if (!r.meta.changes) return json({ error: 'No encontrado' }, 404);
  await audit(env, admin.id, `kyc.${b.decision}`, 'creator_kyc', b.id, { reason });
  return json({ ok: true });
}

// ---------- Consentimiento de terceros ----------

async function addConsent(request, env, user) {
  if (!(await isCreatorVerified(env, user.id))) return json({ error: 'Solo creadores verificados' }, 403);
  const b = await readJson(request);
  if (!b) return json({ error: 'JSON inválido' }, 400);
  const name = clean(b.person_name, 120);
  const email = clean(b.person_email, 200).toLowerCase();
  const contentId = clean(b.content_id, 64);
  if (!name || !contentId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Datos incompletos' }, 400);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO consent_records (id, creator_id, content_id, person_name, person_email, created_at) VALUES (?,?,?,?,?,?)'
  ).bind(id, user.id, contentId, name, email, now()).run();
  // TODO: enviar email a la persona con enlace para confirmar (y subir su propia verificación de edad).
  await audit(env, user.id, 'consent.request', 'content', contentId, { person_email: email });
  return json({ ok: true, id, status: 'pending' }, 201);
}

// ---------- Denuncias ----------

async function createReport(request, env, user) {
  const b = await readJson(request);
  if (!b) return json({ error: 'JSON inválido' }, 400);
  const targetType = clean(b.target_type, 20);
  const targetId = clean(b.target_id, 64);
  const reason = clean(b.reason, 40);
  if (!REPORT_TARGETS.includes(targetType) || !REPORT_REASONS.includes(reason) || !targetId) {
    return json({ error: 'Denuncia inválida' }, 400);
  }

  if (user) {
    const c = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM content_reports WHERE reporter_id=? AND created_at > ?'
    ).bind(user.id, new Date(Date.now() - 36e5).toISOString()).first();
    if (c.n >= 10) return json({ error: 'Demasiadas denuncias, inténtalo más tarde' }, 429);
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO content_reports (id, reporter_id, target_type, target_id, reason, details, priority, created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(id, user?.id ?? null, targetType, targetId, reason, clean(b.details, 1000),
         URGENT_REASONS.includes(reason) ? 1 : 0, now()).run();
  await audit(env, user?.id, 'report.create', targetType, targetId, { reason });
  return json({ ok: true, id }, 201);
}

async function listReports(url, env) {
  const status = ['open', 'reviewing', 'removed', 'dismissed'].includes(url.searchParams.get('status'))
    ? url.searchParams.get('status') : 'open';
  const { results } = await env.DB.prepare(
    'SELECT * FROM content_reports WHERE status=? ORDER BY priority DESC, created_at LIMIT 100'
  ).bind(status).all();
  return json({ items: results });
}

async function resolveReport(request, env, admin) {
  const b = await readJson(request);
  if (!b || !['reviewing', 'removed', 'dismissed'].includes(b.status)) return json({ error: 'Estado inválido' }, 400);
  const resolution = clean(b.resolution, 500);
  if (b.status !== 'reviewing' && !resolution) return json({ error: 'Indica el motivo de la decisión' }, 400);
  const r = await env.DB.prepare(
    'UPDATE content_reports SET status=?, resolved_at=?, resolved_by=?, resolution=? WHERE id=?'
  ).bind(b.status, b.status === 'reviewing' ? null : now(), admin.id, resolution || null, clean(b.id, 64)).run();
  if (!r.meta.changes) return json({ error: 'No encontrado' }, 404);
  // Si status = 'removed', aquí debes ocultar el contenido real (post/perfil) en tu tabla de contenido.
  await audit(env, admin.id, `report.${b.status}`, 'content_report', b.id, { resolution });
  return json({ ok: true });
}
