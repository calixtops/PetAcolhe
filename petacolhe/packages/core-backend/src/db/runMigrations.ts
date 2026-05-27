/**
 * Runner de migrações mínimo: executa em ordem alfabética todos os .sql
 * de um diretório, dentro de uma transação por arquivo, registrando
 * o que já foi aplicado numa tabela `schema_migrations`.
 *
 * Uso:  tsx runMigrations.ts ./src/db/migrations
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { getPool, closePool } from './pool.js';

async function ensureTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function applied(): Promise<Set<string>> {
  const { rows } = await getPool().query<{ name: string }>(
    'SELECT name FROM schema_migrations',
  );
  return new Set(rows.map((r) => r.name));
}

async function run(dir: string): Promise<void> {
  const abs = resolve(process.cwd(), dir);
  await ensureTable();
  const done = await applied();
  const files = (await readdir(abs)).filter((f) => f.endsWith('.sql')).sort();
  const pool = getPool();
  for (const file of files) {
    const name = basename(file);
    if (done.has(name)) {
      // eslint-disable-next-line no-console
      console.log(`= skip ${name}`);
      continue;
    }
    const sql = await readFile(resolve(abs, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      // eslint-disable-next-line no-console
      console.log(`+ applied ${name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

const target = process.argv[2];
if (!target) {
  // eslint-disable-next-line no-console
  console.error('usage: runMigrations <dir>');
  process.exit(1);
}

run(target)
  .then(() => closePool())
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    closePool().finally(() => process.exit(1));
  });
