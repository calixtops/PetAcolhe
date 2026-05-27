import { getPool, NotFoundError } from '@core/backend';

export type AdoptionSpecies = 'cat' | 'dog' | 'other';

export interface PetAdoption {
  id: string;
  name: string;
  species: AdoptionSpecies;
  ageMonths: number | null;
  description: string | null;
  imageUrl: string | null;
  isNeutered: boolean;
  isAdopted: boolean;
  isUrgent: boolean;
  city: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
}

export interface CreateAdoptionInput {
  name: string;
  species: AdoptionSpecies;
  ageMonths?: number;
  description?: string;
  imageUrl?: string;
  isNeutered?: boolean;
  isUrgent?: boolean;
  city?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdBy?: string;
}

export interface CreateInterestInput {
  adoptionId: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  message?: string;
}

export class AdoptionRepository {
  async create(input: CreateAdoptionInput): Promise<PetAdoption> {
    const { rows } = await getPool().query<AdoptionRow>(
      `INSERT INTO pet_adoptions
         (name, species, age_months, description, image_url,
          is_neutered, is_urgent, city, contact_email, contact_phone, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING ${ADOPTION_COLS}`,
      [
        input.name,
        input.species,
        input.ageMonths ?? null,
        input.description ?? null,
        input.imageUrl ?? null,
        input.isNeutered ?? false,
        input.isUrgent ?? false,
        input.city ?? null,
        input.contactEmail ?? null,
        input.contactPhone ?? null,
        input.createdBy ?? null,
      ],
    );
    return toAdoption(rows[0]!);
  }

  async listAvailable(): Promise<PetAdoption[]> {
    const { rows } = await getPool().query<AdoptionRow>(
      `SELECT ${ADOPTION_COLS} FROM pet_adoptions
        WHERE is_adopted = FALSE
        ORDER BY is_urgent DESC, created_at DESC LIMIT 500`,
    );
    return rows.map(toAdoption);
  }

  async markAdopted(id: string): Promise<void> {
    const result = await getPool().query(
      `UPDATE pet_adoptions SET is_adopted = TRUE WHERE id = $1`,
      [id],
    );
    if (result.rowCount === 0) throw new NotFoundError('Adoção não encontrada');
  }

  /** Registra um interesse e devolve o contato do tutor (para o interessado entrar em contato). */
  async createInterest(input: CreateInterestInput): Promise<{
    interestId: string;
    tutorEmail: string | null;
    tutorPhone: string | null;
  }> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ad = await client.query<{ contact_email: string | null; contact_phone: string | null }>(
        `SELECT contact_email, contact_phone FROM pet_adoptions WHERE id = $1`,
        [input.adoptionId],
      );
      if (!ad.rows[0]) throw new NotFoundError('Adoção não encontrada');

      const ins = await client.query<{ id: string }>(
        `INSERT INTO pet_adoption_interests
           (adoption_id, name, contact_email, contact_phone, message)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id`,
        [input.adoptionId, input.name, input.contactEmail ?? null, input.contactPhone ?? null, input.message ?? null],
      );
      await client.query('COMMIT');
      return {
        interestId: ins.rows[0]!.id,
        tutorEmail: ad.rows[0].contact_email,
        tutorPhone: ad.rows[0].contact_phone,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

const ADOPTION_COLS = `
  id, name, species, age_months, description, image_url,
  is_neutered, is_adopted, is_urgent, city, contact_email, contact_phone, created_at
`;

interface AdoptionRow {
  id: string;
  name: string;
  species: AdoptionSpecies;
  age_months: number | null;
  description: string | null;
  image_url: string | null;
  is_neutered: boolean;
  is_adopted: boolean;
  is_urgent: boolean;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: Date;
}

function toAdoption(r: AdoptionRow): PetAdoption {
  return {
    id: r.id,
    name: r.name,
    species: r.species,
    ageMonths: r.age_months,
    description: r.description,
    imageUrl: r.image_url,
    isNeutered: r.is_neutered,
    isAdopted: r.is_adopted,
    isUrgent: r.is_urgent,
    city: r.city,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    createdAt: r.created_at,
  };
}
