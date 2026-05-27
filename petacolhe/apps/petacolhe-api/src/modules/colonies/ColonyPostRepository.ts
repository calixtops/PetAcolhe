import { getPool, NotFoundError } from '@core/backend';
import type { ColonyPost, ColonyPostType } from './ColonyPost.js';

export interface CreatePostInput {
  colonyId: string;
  authorName?: string;
  authorContact?: string;
  postType?: ColonyPostType;
  body: string;
  photos?: string[];
  createdBy?: string;
}

interface PostRow {
  id: string;
  colony_id: string;
  author_name: string | null;
  author_contact: string | null;
  post_type: ColonyPostType;
  body: string;
  photos: string[] | null;
  created_at: Date;
}

export class ColonyPostRepository {
  async list(colonyId: string): Promise<ColonyPost[]> {
    const { rows } = await getPool().query<PostRow>(
      `SELECT id, colony_id, author_name, author_contact,
              post_type, body, photos, created_at
         FROM pet_colony_posts
        WHERE colony_id = $1
        ORDER BY created_at DESC
        LIMIT 500`,
      [colonyId],
    );
    return rows.map(toPost);
  }

  async create(input: CreatePostInput): Promise<ColonyPost> {
    // garante que a colônia existe — evita FK errors confusos
    const exists = await getPool().query(
      `SELECT 1 FROM pet_colonies WHERE geo_point_id = $1`,
      [input.colonyId],
    );
    if (exists.rowCount === 0) throw new NotFoundError('Colônia não encontrada');

    const { rows } = await getPool().query<PostRow>(
      `INSERT INTO pet_colony_posts
         (colony_id, author_name, author_contact, post_type, body, photos, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, colony_id, author_name, author_contact,
                 post_type, body, photos, created_at`,
      [
        input.colonyId,
        input.authorName ?? null,
        input.authorContact ?? null,
        input.postType ?? 'update',
        input.body,
        input.photos ?? [],
        input.createdBy ?? null,
      ],
    );
    return toPost(rows[0]!);
  }
}

function toPost(r: PostRow): ColonyPost {
  return {
    id: r.id,
    colonyId: r.colony_id,
    authorName: r.author_name,
    authorContact: r.author_contact,
    postType: r.post_type,
    body: r.body,
    photos: r.photos ?? [],
    createdAt: r.created_at,
  };
}
