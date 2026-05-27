import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, BadRequestError } from '@core/backend';
import { FeedRepository, type FeedKind } from './FeedRepository.js';

const kindEnum = z.enum(['colony', 'colony_post', 'adoption', 'missing']);

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  before: z.string().datetime().optional(),
  kinds: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',') : v),
    z.array(kindEnum).optional(),
  ),
});

export function buildFeedRouter(repo = new FeedRepository()): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) throw new BadRequestError('parâmetros inválidos', parsed.error.flatten());
      const items = await repo.list({
        limit: parsed.data.limit,
        before: parsed.data.before,
        kinds: parsed.data.kinds as FeedKind[] | undefined,
      });
      // Cursor para a próxima página: createdAt do último item.
      const nextCursor = items.length > 0 ? items[items.length - 1]!.createdAt : null;
      res.json({ items, nextCursor });
    }),
  );

  return router;
}
