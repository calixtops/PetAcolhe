import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, BadRequestError, optionalAuthMiddleware } from '@core/backend';
import { AdoptionRepository } from './AdoptionRepository.js';

const speciesEnum = z.enum(['cat', 'dog', 'other']);

const createSchema = z.object({
  name: z.string().min(2).max(80),
  species: speciesEnum,
  ageMonths: z.number().int().min(0).max(360).optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  isNeutered: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  city: z.string().max(80).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(40).optional(),
}).refine(
  (d) => Boolean(d.contactEmail || d.contactPhone),
  { message: 'Informe ao menos um contato (email ou telefone)' },
);

const interestSchema = z.object({
  name: z.string().min(2).max(80),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(40).optional(),
  message: z.string().max(1000).optional(),
}).refine(
  (d) => Boolean(d.contactEmail || d.contactPhone),
  { message: 'Informe ao menos um contato (email ou telefone)' },
);

export function buildAdoptionsRouter(repo = new AdoptionRepository()): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await repo.listAvailable());
    }),
  );

  router.post(
    '/',
    optionalAuthMiddleware(),
    asyncHandler(async (req, res) => {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) throw new BadRequestError('payload inválido', parsed.error.flatten());
      res.status(201).json(await repo.create({ ...parsed.data, createdBy: req.user?.id }));
    }),
  );

  router.post(
    '/:id/interest',
    asyncHandler(async (req, res) => {
      const parsed = interestSchema.safeParse(req.body);
      if (!parsed.success) throw new BadRequestError('payload inválido', parsed.error.flatten());
      const result = await repo.createInterest({ adoptionId: req.params.id!, ...parsed.data });
      res.status(201).json(result);
    }),
  );

  router.patch(
    '/:id/adopted',
    optionalAuthMiddleware(),
    asyncHandler(async (req, res) => {
      await repo.markAdopted(req.params.id!);
      res.status(204).end();
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
