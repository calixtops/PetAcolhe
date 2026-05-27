import { GeoPointRepository, getPool, NotFoundError } from '@core/backend';

export type MissingSpecies = 'cat' | 'dog' | 'other';

export interface MissingAlert {
  id: string;
  title: string;
  description: string | null;
  lng: number;
  lat: number;
  imageUrl: string | null;
  species: MissingSpecies;
  petName: string;
  lastSeenAt: Date;
  isFound: boolean;
  contactPhone: string | null;
  contactEmail: string | null;
  reward: string | null;
  createdAt: Date;
}

export interface CreateMissingInput {
  title: string;
  description?: string;
  location: { lng: number; lat: number };
  species: MissingSpecies;
  petName: string;
  lastSeenAt: Date;
  contactPhone?: string;
  contactEmail?: string;
  reward?: string;
  imageUrl?: string;
  createdBy?: string;
}

export class MissingRepository {
  private readonly geo = new GeoPointRepository();

  async create(input: CreateMissingInput): Promise<MissingAlert> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const geo = await this.geo.withClient(client).create({
        kind: 'petacolhe:missing',
        title: input.title,
        description: input.description ?? null,
        location: input.location,
        imageUrl: input.imageUrl ?? null,
        createdBy: input.createdBy ?? null,
      });
      await client.query(
        `INSERT INTO pet_missing_alerts
           (geo_point_id, species, pet_name, last_seen_at, contact_phone, contact_email, reward)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          geo.id,
          input.species,
          input.petName,
          input.lastSeenAt,
          input.contactPhone ?? null,
          input.contactEmail ?? null,
          input.reward ?? null,
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
        petName: input.petName,
        lastSeenAt: input.lastSeenAt,
        isFound: false,
        contactPhone: input.contactPhone ?? null,
        contactEmail: input.contactEmail ?? null,
        reward: input.reward ?? null,
        createdAt: geo.createdAt,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listActive(species?: MissingSpecies): Promise<MissingAlert[]> {
    const params: unknown[] = [];
    let where = `WHERE g.kind = 'petacolhe:missing' AND m.is_found = FALSE`;
    if (species) {
      params.push(species);
      where += ` AND m.species = $${params.length}`;
    }
    const { rows } = await getPool().query<MissingRow>(
      `${MISSING_BASE_SELECT} ${where} ORDER BY m.last_seen_at DESC LIMIT 500`,
      params,
    );
    return rows.map(toMissing);
  }

  async markFound(id: string): Promise<void> {
    const result = await getPool().query(
      `UPDATE pet_missing_alerts SET is_found = TRUE WHERE geo_point_id = $1`,
      [id],
    );
    if (result.rowCount === 0) throw new NotFoundError('Alerta não encontrado');
  }
}

interface MissingRow {
  id: string;
  title: string;
  description: string | null;
  lng: number;
  lat: number;
  image_url: string | null;
  species: MissingSpecies;
  pet_name: string;
  last_seen_at: Date;
  is_found: boolean;
  contact_phone: string | null;
  contact_email: string | null;
  reward: string | null;
  created_at: Date;
}

const MISSING_BASE_SELECT = `
  SELECT g.id, g.title, g.description, g.lng, g.lat, g.image_url,
         m.species, m.pet_name, m.last_seen_at, m.is_found,
         m.contact_phone, m.contact_email, m.reward, g.created_at
    FROM geo_points g
    JOIN pet_missing_alerts m ON m.geo_point_id = g.id
`;

function toMissing(r: MissingRow): MissingAlert {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    lng: Number(r.lng),
    lat: Number(r.lat),
    imageUrl: r.image_url,
    species: r.species,
    petName: r.pet_name,
    lastSeenAt: r.last_seen_at,
    isFound: r.is_found,
    contactPhone: r.contact_phone,
    contactEmail: r.contact_email,
    reward: r.reward,
    createdAt: r.created_at,
  };
}
