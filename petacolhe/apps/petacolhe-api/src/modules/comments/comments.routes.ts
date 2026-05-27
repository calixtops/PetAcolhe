import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, BadRequestError, optionalAuthMiddleware } from '@core/backend';
import { CommentRepository, type CommentTargetKind } from './CommentRepository.js';

const targetKindEnum = z.enum(['adoption', 'missing', 'colony', 'colony_post']);

const listQuerySchema = z.object({
  targetKind: targetKindEnum,
  targetId: z.string().uuid(),
});

const createSchema = z.object({
  targetKind: targetKindEnum,
  targetId: z.string().uuid(),
  body: z.string().min(1).max(1000),
  authorName: z.string().max(140).optional(),
  authorContact: z.string().max(140).optional(),
});

export function buildCommentsRouter(repo = new CommentRepository()): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new BadRequestError('parâmetros inválidos', parsed.error.flatten());
      res.json(await repo.list(parsed.data.targetKind as CommentTargetKind, parsed.data.targetId));
    }),
  );

  router.post(
    '/',
    optionalAuthMiddleware(),
    asyncHandler(async (req, res) => {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) throw new BadRequestError('payload inválido', parsed.error.flatten());
      const created = await repo.create({
        targetKind: parsed.data.targetKind as CommentTargetKind,
        targetId: parsed.data.targetId,
        body: parsed.data.body,
        authorName: parsed.data.authorName,
        authorContact: parsed.data.authorContact,
        createdBy: req.user?.id,
      });
      res.status(201).json(created);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await repo.delete(req.params.id!);
      res.status(204).end();
    }),
  );

  return router;
}
