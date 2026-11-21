-- ONLYFACKINGS · Cumplimiento legal (D1 / SQLite)
-- Se añade SIN tocar tu tabla users. Aplicar con:
--   npx wrangler d1 execute <NOMBRE_BD> --remote --file=schema_cumplimiento.sql
-- Asume que users(id) existe. Si tu PK de usuario es otra, ajusta user_id.

-- Verificación de edad (fans y creadores)
CREATE TABLE IF NOT EXISTS age_verifications (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','verified','rejected','expired')),
  method        TEXT NOT NULL,              -- veriff | onfido | stripe_identity | manual
  provider_ref  TEXT UNIQUE,                -- id de sesión en el proveedor
  created_at    TEXT NOT NULL,
  verified_at   TEXT,
  expires_at    TEXT                        -- recomendable reverificar (ej. 12 meses)
);
CREATE INDEX IF NOT EXISTS idx_age_user ON age_verifications(user_id, status);

-- KYC de creadores (identidad real). NO guardes aquí fotos del DNI:
-- que las guarde el proveedor. Aquí solo el resultado.
CREATE TABLE IF NOT EXISTS creator_kyc (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','revoked')),
  provider      TEXT NOT NULL,
  provider_ref  TEXT UNIQUE,
  legal_name    TEXT NOT NULL,
  country       TEXT NOT NULL,              -- ISO-2
  reject_reason TEXT,
  created_at    TEXT NOT NULL,
  reviewed_at   TEXT,
  reviewed_by   TEXT
);
CREATE INDEX IF NOT EXISTS idx_kyc_user ON creator_kyc(user_id, status);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON creator_kyc(status, created_at);

-- Consentimiento de terceros que aparecen en el contenido
CREATE TABLE IF NOT EXISTS consent_records (
  id            TEXT PRIMARY KEY,
  creator_id    TEXT NOT NULL,
  content_id    TEXT NOT NULL,
  person_name   TEXT NOT NULL,
  person_email  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','revoked')),
  created_at    TEXT NOT NULL,
  confirmed_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_consent_content ON consent_records(content_id);

-- Denuncias de contenido / perfiles (DSA: mecanismo de notificación y acción)
CREATE TABLE IF NOT EXISTS content_reports (
  id            TEXT PRIMARY KEY,
  reporter_id   TEXT,                       -- NULL si es anónima
  target_type   TEXT NOT NULL CHECK (target_type IN ('post','profile','message','comment')),
  target_id     TEXT NOT NULL,
  reason        TEXT NOT NULL,
  details       TEXT,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','reviewing','removed','dismissed')),
  priority      INTEGER NOT NULL DEFAULT 0, -- 1 = urgente (menores / sin consentimiento)
  created_at    TEXT NOT NULL,
  resolved_at   TEXT,
  resolved_by   TEXT,
  resolution    TEXT                        -- motivo comunicable al afectado (DSA art. 17)
);
CREATE INDEX IF NOT EXISTS idx_reports_queue ON content_reports(status, priority DESC, created_at);

-- Auditoría de acciones sensibles
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    TEXT,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  meta        TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target_type, target_id);
