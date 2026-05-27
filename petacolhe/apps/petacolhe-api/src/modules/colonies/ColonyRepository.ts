import { GeoPointRepository, getPool, NotFoundError } from '@core/backend';
import type { ColonyNeed, PetColony, PetNeuterStatus, PetSpecies } from './Colony.js';

export interface CreateColonyInput {
  title: string;
  description?: string;
  location: { lng: number; lat: number };
  species: PetSpecies;
  estimatedCount: number;
  neuterStatus?: PetNeuterStatus;
  caretakerName?: string;
  contactPhone?: string;
  contactEmail?: string;
  feedingSchedule?: string;
  needs?: ColonyNeed[];
  imageUrl?: string;
  createdBy?: string;
}

export interface ColonyFilters {
  species?: PetSpecies;
  neuterStatus?: PetNeuterStatus;
  needs?: ColonyNeed[]; // colonia tem QUALQUER dessas needs
}

export class ColonyRepository {
  private readonly geo = new GeoPointRepository();

  async create(input: CreateColonyInput): Promise<PetColony> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const geo = await this.geo.withClient(client).create({
        kind: 'petacolhe:colony',
        title: input.title,
        description: input.description ?? null,
        location: input.location,
        imageUrl: input.imageUrl ?? null,
        createdBy: input.createdBy ?? null,
      });
      await client.query(
        `INSERT INTO pet_colonies
           (geo_point_id, species, estimated_count, neuter_status,
            caretaker_name, contact_phone, contact_email, feeding_schedule, needs)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          geo.id,
          input.species,
          input.estimatedCount,
          input.neuterStatus ?? 'none',
          input.caretakerName ?? null,
          input.contactPhone ?? null,
          input.contactEmail ?? null,
          input.feedingSchedule ?? null,
          input.needs ?? [],
        ],
      );
      await client.query('COMMIT');
      return {
        id: geo.id,
        title: geo.title,
        description: geo.description,
        lng: geo.lng,
        lat: geo.lat,
        imageUrl: geo.imageUrl,
        species: input.species,
        estimatedCount: input.estimatedCount,
        neuterStatus: input.neuterStatus ?? 'none',
        caretakerName: input.caretakerName ?? null,
        contactPhone: input.contactPhone ?? null,
        contactEmail: input.contactEmail ?? null,
        feedingSchedule: input.feedingSchedule ?? null,
        needs: input.needs ?? [],
        createdAt: geo.createdAt,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listAll(filters: ColonyFilters = {}): Promise<PetColony[]> {
    const { sql, params } = applyFilters(
      COLONY_BASE_SELECT + ` FROM geo_points g
                            JOIN pet_colonies c ON c.geo_point_id = g.id
                            WHERE g.kind = 'petacolhe:colony'`,
      filters,
    );
    const { rows } = await getPool().query<ColonyRow>(
      sql + ' ORDER BY g.created_at DESC LIMIT 500',
      params,
    );
    return rows.map(toColony);
  }

  async findNearby(
    center: { lng: number; lat: number },
    radiusMeters: number,
    filters: ColonyFilters = {},
  ): Promise<Array<PetColony & { distanceMeters: number }>> {
    const baseParams: unknown[] = [center.lng, center.lat, radiusMeters];
    const { sql, params } = applyFilters(
      COLONY_BASE_SELECT +
        `, ST_Distance(g.geom::geography,
                       ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance_m
          FROM geo_points g
          JOIN pet_colonies c ON c.geo_point_id = g.id
         WHERE g.kind = 'petacolhe:colony'
           AND ST_DWithin(g.geom::geography,
                          ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)`,
      filters,
      baseParams,
    );
    const { rows } = await getPool().query<ColonyRow & { distance_m: string }>(
      sql + ' ORDER BY distance_m ASC LIMIT 200',
      params,
    );
    return rows.map((r) => ({ ...toColony(r), distanceMeters: Number(r.distance_m) }));
  }

  async updateNeuterStatus(id: string, status: PetNeuterStatus): Promise<void> {
    const result = await getPool().query(
      `UPDATE pet_colonies SET neuter_status = $1 WHERE geo_point_id = $2`,
      [status, id],
    );
    if (result.rowCount === 0) throw new NotFoundError('Colônia não encontrada');
  }

  async findById(id: string): Promise<PetColony | null> {
    const { rows } = await getPool().query<ColonyRow>(
      COLONY_BASE_SELECT +
        ` FROM geo_points g
          JOIN pet_colonies c ON c.geo_point_id = g.id
         WHERE g.kind = 'petacolhe:colony' AND g.id = $1`,
      [id],
    );
    return rows[0] ? toColony(rows[0]) : null;
  }

  async updateStats(
    id: string,
    patch: {
      estimatedCount?: number;
      neuterStatus?: PetNeuterStatus;
      needs?: ColonyNeed[];
      feedingSchedule?: string | null;
    },
  ): Promise<PetColony> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.estimatedCount !== undefined) {
      params.push(patch.estimatedCount);
      sets.push(`estimated_count = $${params.length}`);
    }
    if (patch.neuterStatus !== undefined) {
      params.push(patch.neuterStatus);
      sets.push(`neuter_status = $${params.length}`);
    }
    if (patch.needs !== undefined) {
      params.push(patch.needs);
      sets.push(`needs = $${params.length}`);
    }
    if (patch.feedingSchedule !== undefined) {
      params.push(patch.feedingSchedule);
      sets.push(`feeding_schedule = $${params.length}`);
    }
    if (sets.length > 0) {
      params.push(id);
      const result = await getPool().query(
        `UPDATE pet_colonies SET ${sets.join(', ')} WHERE geo_point_id = $${params.length}`,
        params,
      );
      if (result.rowCount === 0) throw new NotFoundError('Colônia não encontrada');
    }
    const updated = await this.findById(id);
    if (!updated) throw new NotFoundError('Colônia não encontrada');
    return updated;
  }
}

interface ColonyRow {
  id: string;
  title: string;
  description: string | null;
  lng: number;
  lat: number;
  image_url: string | null;
  species: PetSpecies;
  estimated_count: number;
  neuter_status: PetNeuterStatus;
  caretaker_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  feeding_schedule: string | null;
  needs: ColonyNeed[];
  created_at: Date;
}

const COLONY_BASE_SELECT = `
  SELECT g.id, g.title, g.description, g.lng, g.lat, g.image_url,
         c.species, c.estimated_count, c.neuter_status,
         c.caretaker_name, c.contact_phone, c.contact_email,
         c.feeding_schedule, c.needs, g.created_at
`;

function applyFilters(
  baseSql: string,
  filters: ColonyFilters,
  initial: unknown[] = [],
): { sql: string; params: unknown[] } {
  const params = [...initial];
  const where: string[] = [];
  if (filters.species) {
    params.push(filters.species);
    where.push(`c.species = $${params.length}`);
  }
  if (filters.neuterStatus) {
    params.push(filters.neuterStatus);
    where.push(`c.neuter_status = $${params.length}`);
  }
  if (filters.needs && filters.needs.length > 0) {
    params.push(filters.needs);
    where.push(`c.needs && $${params.length}::text[]`);
  }
  const sql = where.length ? `${baseSql} AND ${where.join(' AND ')}` : baseSql;
  return { sql, params };
}

function toColony(r: ColonyRow): PetColony {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    lng: Number(r.lng),
    lat: Number(r.lat),
    imageUrl: r.image_url,
    species: r.species,
    estimatedCount: r.estimated_count,
    neuterStatus: r.neuter_status,
    caretakerName: r.caretaker_name,
    contactPhone: r.contact_phone,
    contactEmail: r.contact_email,
    feedingSchedule: r.feeding_schedule,
    needs: r.needs ?? [],
    createdAt: r.created_at,
  };
}
