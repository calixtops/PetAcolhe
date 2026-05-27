import { GeoPointRepository, getPool, NotFoundError } from '@core/backend';

export type PartnerType = 'clinic' | 'ngo' | 'petshop' | 'volunteer' | 'donor' | 'other';
export type PartnerService =
  | 'castration' | 'vaccine' | 'consultation' | 'adoption'
  | 'food_donation' | 'shelter' | 'transport';

export const PARTNER_SERVICES: PartnerService[] = [
  'castration', 'vaccine', 'consultation', 'adoption',
  'food_donation', 'shelter', 'transport',
];

export interface Partner {
  id: string;
  title: string;
  description: string | null;
  lng: number;
  lat: number;
  imageUrl: string | null;
  partnerType: PartnerType;
  services: PartnerService[];
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  freeServices: boolean;
  createdAt: Date;
}

export interface CreatePartnerInput {
  title: string;
  description?: string;
  location: { lng: number; lat: number };
  partnerType: PartnerType;
  services?: PartnerService[];
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  freeServices?: boolean;
  imageUrl?: string;
  createdBy?: string;
}

export interface PartnerFilters {
  partnerType?: PartnerType;
  services?: PartnerService[];
  onlyFree?: boolean;
}

export class PartnerRepository {
  private readonly geo = new GeoPointRepository();

  async create(input: CreatePartnerInput): Promise<Partner> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const geo = await this.geo.withClient(client).create({
        kind: 'petacolhe:partner',
        title: input.title,
        description: input.description ?? null,
        location: input.location,
        imageUrl: input.imageUrl ?? null,
        createdBy: input.createdBy ?? null,
      });
      await client.query(
        `INSERT INTO pet_partners
           (geo_point_id, partner_type, services, contact_email,
            contact_phone, website, free_services)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          geo.id,
          input.partnerType,
          input.services ?? [],
          input.contactEmail ?? null,
          input.contactPhone ?? null,
          input.website ?? null,
          input.freeServices ?? false,
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
        partnerType: input.partnerType,
        services: input.services ?? [],
        contactEmail: input.contactEmail ?? null,
        contactPhone: input.contactPhone ?? null,
        website: input.website ?? null,
        freeServices: input.freeServices ?? false,
        createdAt: geo.createdAt,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listAll(filters: PartnerFilters = {}): Promise<Partner[]> {
    const params: unknown[] = [];
    const where: string[] = [`g.kind = 'petacolhe:partner'`];
    if (filters.partnerType) {
      params.push(filters.partnerType);
      where.push(`p.partner_type = $${params.length}`);
    }
    if (filters.services && filters.services.length > 0) {
      params.push(filters.services);
      where.push(`p.services && $${params.length}::text[]`);
    }
    if (filters.onlyFree) where.push(`p.free_services = TRUE`);

    const { rows } = await getPool().query<PartnerRow>(
      `${PARTNER_BASE_SELECT}
        WHERE ${where.join(' AND ')}
        ORDER BY g.created_at DESC LIMIT 500`,
      params,
    );
    return rows.map(toPartner);
  }

  async delete(id: string): Promise<void> {
    const result = await getPool().query(`DELETE FROM geo_points WHERE id = $1`, [id]);
    if (result.rowCount === 0) throw new NotFoundError('Parceiro não encontrado');
  }
}

interface PartnerRow {
  id: string;
  title: string;
  description: string | null;
  lng: number;
  lat: number;
  image_url: string | null;
  partner_type: PartnerType;
  services: PartnerService[];
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  free_services: boolean;
  created_at: Date;
}

const PARTNER_BASE_SELECT = `
  SELECT g.id, g.title, g.description, g.lng, g.lat, g.image_url,
         p.partner_type, p.services, p.contact_email, p.contact_phone,
         p.website, p.free_services, g.created_at
    FROM geo_points g
    JOIN pet_partners p ON p.geo_point_id = g.id
`;

function toPartner(r: PartnerRow): Partner {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    lng: Number(r.lng),
    lat: Number(r.lat),
    imageUrl: r.image_url,
    partnerType: r.partner_type,
    services: r.services ?? [],
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    website: r.website,
    freeServices: r.free_services,
    createdAt: r.created_at,
  };
}
