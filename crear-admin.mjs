// ONLYFACKINGS · crear-admin.mjs
// Se ejecuta EN TU ORDENADOR (nunca en el servidor):
//   node crear-admin.mjs
// Te pide correo y contraseña, y genera admin_insert.sql con el hash (la contraseña no se guarda).
// Después:
//   npx wrangler d1 execute NOMBRE_BD --remote --file=admin_insert.sql
//   y BORRA admin_insert.sql. NO lo subas a GitHub (el repo es público).

import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import readline from 'node:readline';

const ITER = 100000; // máximo que admite WebCrypto en Cloudflare Workers

function ask(q, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => process.stdout.write(s.startsWith(q) ? s : '*');
    rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a); });
  });
}

const email = (await ask('Correo del administrador: ')).trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { console.error('Correo no válido.'); process.exit(1); }

const pass = await ask('Contraseña (mínimo 14 caracteres): ', true);
const again = await ask('Repite la contraseña: ', true);
if (pass !== again) { console.error('No coinciden.'); process.exit(1); }
if (pass.length < 14) { console.error('Demasiado corta: usa al menos 14 caracteres.'); process.exit(1); }

const salt = randomBytes(16);
const hash = pbkdf2Sync(pass, salt, ITER, 32, 'sha256');
const stored = `pbkdf2$${ITER}$${salt.toString('base64')}$${hash.toString('base64')}`;
const q = (s) => s.replace(/'/g, "''");

const sql =
  `INSERT OR REPLACE INTO admins (id, email, password_hash, created_at) ` +
  `VALUES ('${randomUUID()}', '${q(email)}', '${q(stored)}', '${new Date().toISOString()}');\n`;
writeFileSync('admin_insert.sql', sql);
console.log('\nListo: admin_insert.sql creado.');
console.log('Ejecuta: npx wrangler d1 execute NOMBRE_BD --remote --file=admin_insert.sql');
console.log('Luego borra admin_insert.sql y no lo subas a GitHub.');
