import type { Pool, PoolClient } from 'pg';
import { getPool } from '../db/pool.js';
import type {
  CreateGeoPointInput,
  GeoPoint,
  LngLat,
  NearbyQuery,
} from './GeoPoint.js';

type Executor = Pool | PoolClient;

/**
 * Repositório base para a tabela `geo_points`.
 *
 * Os módulos de domínio (Reports, Colonies, ...) compõem este repositório:
 * criam o ponto aqui e gravam apenas seus campos extras em sua própria
 * tabela com FK para `geo_points.id`. Isso mantém o reuso total das queries
 * espaciais.
 */
export class GeoPointRepository {
  constructor(private readonly db: Executor = getPool()) {}

  /** Permite operar dentro de uma transação externa. */
  withClient(client: PoolClient): GeoPointRepository {
    return new GeoPointRepository(client);
  }

  async create<TMeta extends object = Record<string, unknown>>(
    input: CreateGeoPointInput<TMeta>,
  ): Promise<GeoPoint<TMeta>> {
    const { kind, title, description = null, location, imageUrl = null, metadata = {} as TMeta, createdBy = null } = input;
    const { rows } = await this.db.query<GeoPointRow>(
      `
      INSERT INTO geo_points (kind, title, description, geom, image_url, metadata, created_by)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7::jsonb, $8)
      RETURNING id, kind, title, description, lng, lat, image_url, metadata, created_by, created_at, updated_at
      `,
      [kind, title, description, location.lng, location.lat, imageUrl, JSON.stringify(metadata), createdBy],
    );
    return mapRow<TMeta>(rows[0]!);
  }

  async findById<TMeta extends object = Record<string, unknown>>(
    id: string,
  ): Promise<GeoPoint<TMeta> | null> {
    const { rows } = await this.db.query<GeoPointRow>(
      `SELECT id, kind, title, description, lng, lat, image_url, metadata, created_by, created_at, updated_at
         FROM geo_points WHERE id = $1`,
      [id],
    );
    return rows[0] ? mapRow<TMeta>(rows[0]) : null;
  }

  /**
   * Busca pontos num raio (em metros) de uma coordenada.
   * Usa cast para `geography` para que a distância seja em metros sobre a Terra.
   * O índice GIST em `geom` é utilizado pelo planner via ST_DWithin.
   */
  async findNearby<TMeta extends object = Record<string, unknown>>(
    q: NearbyQuery,
  ): Promise<Array<GeoPoint<TMeta> & { distanceMeters: number }>> {
    const limit = q.limit ?? 200;
    const { rows } = await this.db.query<GeoPointRow & { distance_m: string }>(
      `
      SELECT id, kind, title, description, lng, lat, image_url, metadata,
             created_by, created_at, updated_at,
             ST_Distance(
               geom::geography,
               ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
             ) AS distance_m
      FROM geo_points
      WHERE kind = $3
        AND ST_DWithin(
              geom::geography,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
              $4
            )
      ORDER BY distance_m ASC
      LIMIT $5
      `,
      [q.center.lng, q.center.lat, q.kind, q.radiusMeters, limit],
    );
    return rows.map((row) => ({
      ...mapRow<TMeta>(row),
      distanceMeters: Number(row.distance_m),
    }));
  }

  async listByKind<TMeta extends object = Record<string, unknown>>(
    kind: string,
    limit = 500,
  ): Promise<Array<GeoPoint<TMeta>>> {
    const { rows } = await this.db.query<GeoPointRow>(
      `SELECT id, kind, title, description, lng, lat, image_url, metadata, created_by, created_at, updated_at
         FROM geo_points
        WHERE kind = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [kind, limit],
    );
    return rows.map((r) => mapRow<TMeta>(r));
  }

  async updateLocation(id: string, location: LngLat): Promise<void> {
    await this.db.query(
      `UPDATE geo_points
          SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)
        WHERE id = $3`,
      [location.lng, location.lat, id],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM geo_points WHERE id = $1', [id]);
  }
}

// --------------------------------------------------------------
interface GeoPointRow {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  lng: number;
  lat: number;
  image_url: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow<TMeta extends object>(row: GeoPointRow): GeoPoint<TMeta> {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    lng: Number(row.lng),
    lat: Number(row.lat),
    imageUrl: row.image_url,
    metadata: row.metadata as TMeta,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
