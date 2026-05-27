import { Pool, type PoolConfig } from 'pg';

let pool: Pool | null = null;

export function getPool(config?: PoolConfig): Pool {
  if (pool) return pool;
  pool = new Pool(
    config ?? {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      database: process.env.POSTGRES_DB ?? 'geo_apps',
      user: process.env.POSTGRES_USER ?? 'geo',
      password: process.env.POSTGRES_PASSWORD ?? 'geo_dev_pw',
      max: 10,
    },
  );
  pool.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[pg] unexpected error on idle client', err);
  });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
