import { getPool } from '@core/backend';
import { CommentRepository, type CommentTargetKind } from '../comments/CommentRepository.js';

/**
 * Tipos de evento que aparecem no feed unificado.
 *  - colony       → nova colônia cadastrada
 *  - colony_post  → atualização/foto/pedido no fórum da colônia
 *  - adoption     → pet disponível para adoção
 *  - missing      → alerta de animal desaparecido
 */
export type FeedKind = 'colony' | 'colony_post' | 'adoption' | 'missing';

export interface FeedItem {
  id: string;
  kind: FeedKind;
  refId: string;        // id da entidade-alvo (colônia, adoção, alerta)
  title: string;
  body: string | null;
  imageUrl: string | null;
  photos: string[];     // só preenchido em colony_post
  species: string | null;
  postType: string | null; // só preenchido em colony_post
  authorName: string | null;
  location: { lng: number; lat: number } | null;
  createdAt: string;    // ISO
  commentCount: number;
}

interface Row {
  id: string;
  kind: FeedKind;
  ref_id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  photos: string[] | null;
  species: string | null;
  post_type: string | null;
  author_name: string | null;
  lng: number | null;
  lat: number | null;
  created_at: Date;
}

export interface FeedQuery {
  /** Limite de itens (default 20, máx 50). */
  limit?: number;
  /** Pega itens estritamente mais antigos que este ISO timestamp (cursor). */
  before?: string;
  /** Filtra por tipo de evento. */
  kinds?: FeedKind[];
}

export class FeedRepository {
  private readonly comments = new CommentRepository();

  async list(q: FeedQuery = {}): Promise<FeedItem[]> {
    const limit = Math.min(Math.max(q.limit ?? 20, 1), 50);
    const params: unknown[] = [];
    const where: string[] = [];

    if (q.before) {
      params.push(q.before);
      where.push(`created_at < $${params.length}`);
    }
    if (q.kinds && q.kinds.length > 0) {
      params.push(q.kinds);
      where.push(`kind = ANY($${params.length}::text[])`);
    }
    params.push(limit);
    const limitParam = `$${params.length}`;

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      WITH unified AS (
        SELECT
          c.geo_point_id::text       AS id,
          'colony'::text             AS kind,
          c.geo_point_id::text       AS ref_id,
          gp.title                   AS title,
          gp.description             AS body,
          gp.image_url               AS image_url,
          NULL::text[]               AS photos,
          c.species::text            AS species,
          NULL::text                 AS post_type,
          NULL::text                 AS author_name,
          gp.lng                     AS lng,
          gp.lat                     AS lat,
          gp.created_at              AS created_at
        FROM pet_colonies c
        JOIN geo_points gp ON gp.id = c.geo_point_id

        UNION ALL

        SELECT
          p.id::text,
          'colony_post'::text,
          p.colony_id::text,
          gp.title,
          p.body,
          CASE WHEN array_length(p.photos, 1) > 0 THEN p.photos[1] ELSE NULL END,
          p.photos,
          NULL,
          p.post_type::text,
          p.author_name,
          gp.lng,
          gp.lat,
          p.created_at
        FROM pet_colony_posts p
        JOIN geo_points gp ON gp.id = p.colony_id

        UNION ALL

        SELECT
          a.id::text,
          'adoption'::text,
          a.id::text,
          a.name,
          a.description,
          a.image_url,
          NULL::text[],
          a.species::text,
          NULL,
          NULL,
          NULL::double precision,
          NULL::double precision,
          a.created_at
        FROM pet_adoptions a
        WHERE a.is_adopted = false

        UNION ALL

        SELECT
          m.geo_point_id::text,
          'missing'::text,
          m.geo_point_id::text,
          gp.title,
          gp.description,
          gp.image_url,
          NULL::text[],
          m.species::text,
          NULL,
          NULL,
          gp.lng,
          gp.lat,
          gp.created_at
        FROM pet_missing_alerts m
        JOIN geo_points gp ON gp.id = m.geo_point_id
        WHERE m.is_found = false
      )
      SELECT * FROM unified
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limitParam}
    `;

    const { rows } = await getPool().query<Row>(sql, params);
    const items: FeedItem[] = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      refId: r.ref_id,
      title: r.title,
      body: r.body,
      imageUrl: r.image_url,
      photos: r.photos ?? [],
      species: r.species,
      postType: r.post_type,
      authorName: r.author_name,
      location: r.lng != null && r.lat != null ? { lng: r.lng, lat: r.lat } : null,
      createdAt: r.created_at.toISOString(),
      commentCount: 0,
    }));

    // Contagem de comentários em UMA query agregada (não N+1).
    const counts = await this.comments.countByTargets(
      items.map((it) => ({ kind: it.kind as CommentTargetKind, id: it.refId })),
    );
    for (const it of items) {
      it.commentCount = counts.get(`${it.kind}:${it.refId}`) ?? 0;
    }
    return items;
  }
}
