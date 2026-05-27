import { getPool, NotFoundError } from '@core/backend';

export type CommentTargetKind = 'adoption' | 'missing' | 'colony' | 'colony_post';

export interface Comment {
  id: string;
  targetKind: CommentTargetKind;
  targetId: string;
  authorName: string | null;
  authorContact: string | null;
  body: string;
  createdAt: string;
}

export interface CreateCommentInput {
  targetKind: CommentTargetKind;
  targetId: string;
  authorName?: string;
  authorContact?: string;
  body: string;
  createdBy?: string;
}

interface Row {
  id: string;
  target_kind: CommentTargetKind;
  target_id: string;
  author_name: string | null;
  author_contact: string | null;
  body: string;
  created_at: Date;
}

const toComment = (r: Row): Comment => ({
  id: r.id,
  targetKind: r.target_kind,
  targetId: r.target_id,
  authorName: r.author_name,
  authorContact: r.author_contact,
  body: r.body,
  createdAt: r.created_at.toISOString(),
});

export class CommentRepository {
  async list(targetKind: CommentTargetKind, targetId: string): Promise<Comment[]> {
    const { rows } = await getPool().query<Row>(
      `SELECT id, target_kind, target_id, author_name, author_contact, body, created_at
       FROM pet_comments
       WHERE target_kind = $1 AND target_id = $2
       ORDER BY created_at ASC`,
      [targetKind, targetId],
    );
    return rows.map(toComment);
  }

  async create(input: CreateCommentInput): Promise<Comment> {
    const { rows } = await getPool().query<Row>(
      `INSERT INTO pet_comments
        (target_kind, target_id, author_name, author_contact, body, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, target_kind, target_id, author_name, author_contact, body, created_at`,
      [
        input.targetKind,
        input.targetId,
        input.authorName ?? null,
        input.authorContact ?? null,
        input.body.trim(),
        input.createdBy ?? null,
      ],
    );
    return toComment(rows[0]!);
  }

  async delete(id: string): Promise<void> {
    const result = await getPool().query(`DELETE FROM pet_comments WHERE id = $1`, [id]);
    if (result.rowCount === 0) throw new NotFoundError('Comentário não encontrado');
  }

  /**
   * Contagem agregada por alvo — usado pelo feed para exibir "💬 N" em cada card
   * sem precisar fazer N queries.
   */
  async countByTargets(
    targets: Array<{ kind: CommentTargetKind; id: string }>,
  ): Promise<Map<string, number>> {
    if (targets.length === 0) return new Map();
    const kinds = targets.map((t) => t.kind);
    const ids = targets.map((t) => t.id);
    const { rows } = await getPool().query<{ target_kind: string; target_id: string; n: string }>(
      `SELECT target_kind, target_id::text, COUNT(*)::text AS n
       FROM pet_comments
       WHERE (target_kind, target_id) IN (
         SELECT * FROM UNNEST($1::text[], $2::uuid[])
       )
       GROUP BY target_kind, target_id`,
      [kinds, ids],
    );
    const map = new Map<string, number>();
    for (const r of rows) map.set(`${r.target_kind}:${r.target_id}`, Number(r.n));
    return map;
  }
}
