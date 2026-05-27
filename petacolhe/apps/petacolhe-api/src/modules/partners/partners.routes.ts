import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, BadRequestError, optionalAuthMiddleware } from '@core/backend';
import { PartnerRepository } from './PartnerRepository.js';

const partnerTypeEnum = z.enum(['clinic', 'ngo', 'petshop', 'volunteer', 'donor', 'other']);
const serviceEnum = z.enum([
  'castration', 'vaccine', 'consultation', 'adoption',
  'food_donation', 'shelter', 'transport',
]);

const createSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().max(2000).optional(),
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  partnerType: partnerTypeEnum,
  services: z.array(serviceEnum).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(40).optional(),
  website: z.string().url().optional(),
  freeServices: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
});

const filtersSchema = z.object({
  partnerType: partnerTypeEnum.optional(),
  services: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',') : v),
    z.array(serviceEnum).optional(),
  ),
  onlyFree: z.preprocess((v) => v === 'true' || v === true, z.boolean().optional()),
});

export function buildPartnersRouter(repo = new PartnerRepository()): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = filtersSchema.safeParse(req.query);
      if (!parsed.success) throw new BadRequestError('filtros inválidos', parsed.error.flatten());
      res.json(await repo.listAll(parsed.data));
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
        partnerType: d.partnerType,
        services: d.services,
        contactEmail: d.contactEmail,
        contactPhone: d.contactPhone,
        website: d.website,
        freeServices: d.freeServices,
        imageUrl: d.imageUrl,
        createdBy: req.user?.id,
      });
      res.status(201).json(created);
    }),
  );

  return router;
}
