-- ONLYFACKINGS · Administrador, sesiones y baneos (D1)
-- npx wrangler d1 execute NOMBRE_BD --remote --file=schema_admin.sql

CREATE TABLE IF NOT EXISTS admins (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,          -- pbkdf2$iteraciones$salt$hash
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,          -- SHA-256 del token (el token real solo vive en la cookie)
  admin_id   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_exp ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ip      TEXT NOT NULL,
  at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_ip ON admin_login_attempts(ip, at);

CREATE TABLE IF NOT EXISTS user_bans (
  user_id    TEXT PRIMARY KEY,
  reason     TEXT NOT NULL,
  banned_by  TEXT NOT NULL,
  banned_at  TEXT NOT NULL,
  expires_at TEXT                       -- NULL = permanente
);
