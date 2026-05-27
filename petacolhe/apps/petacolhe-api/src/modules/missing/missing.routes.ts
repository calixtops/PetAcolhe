import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, BadRequestError, optionalAuthMiddleware } from '@core/backend';
import { MissingRepository } from './MissingRepository.js';

const speciesEnum = z.enum(['cat', 'dog', 'other']);

const createSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().max(2000).optional(),
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  species: speciesEnum,
  petName: z.string().min(1).max(80),
  lastSeenAt: z.coerce.date(),
  contactPhone: z.string().max(40).optional(),
  contactEmail: z.string().email().optional(),
  reward: z.string().max(280).optional(),
  imageUrl: z.string().url().optional(),
}).refine(
  (d) => Boolean(d.contactPhone || d.contactEmail),
  { message: 'Informe ao menos um contato (telefone ou e-mail)' },
);

const listQuerySchema = z.object({ species: speciesEnum.optional() });

export function buildMissingRouter(repo = new MissingRepository()): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new BadRequestError('parâmetros inválidos');
      res.json(await repo.listActive(parsed.data.species));
    }),
  );

  router.post(
    '/',
    optionalAuthMiddleware(),
    asyncHandler(async (req, res) => {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) throw new BadRequestError('payload inválido', parsed.error.flatten());
      const d = parsed.data;
      const created = await repo.create({
        title: d.title,
        description: d.description,
        location: { lng: d.lng, lat: d.lat },
        species: d.species,
        petName: d.petName,
        lastSeenAt: d.lastSeenAt,
        contactPhone: d.contactPhone,
        contactEmail: d.contactEmail,
        reward: d.reward,
        imageUrl: d.imageUrl,
        createdBy: req.user?.id,
      });
      res.status(201).json(created);
    }),
  );

  router.patch(
    '/:id/found',
    optionalAuthMiddleware(),
    asyncHandler(async (req, res) => {
      await repo.markFound(req.params.id!);
      res.status(204).end();
    }),
  );

  return router;
}
