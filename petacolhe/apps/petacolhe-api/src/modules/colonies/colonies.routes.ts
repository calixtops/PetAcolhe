import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, BadRequestError, NotFoundError, optionalAuthMiddleware } from '@core/backend';
import { ColonyRepository } from './ColonyRepository.js';
import { ColonyPostRepository } from './ColonyPostRepository.js';

const speciesEnum = z.enum(['cat', 'dog', 'other']);
const neuterEnum = z.enum(['none', 'partial', 'in_progress', 'complete']);
const needsEnum = z.enum([
  'food', 'medicine', 'vet', 'castration', 'transport', 'shelter', 'volunteer',
]);

const createSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().max(2000).optional(),
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  species: speciesEnum,
  estimatedCount: z.number().int().min(0),
  neuterStatus: neuterEnum.optional(),
  caretakerName: z.string().max(140).optional(),
  contactPhone: z.string().max(40).optional(),
  contactEmail: z.string().email().optional(),
  feedingSchedule: z.string().max(280).optional(),
  needs: z.array(needsEnum).optional(),
  imageUrl: z.string().url().optional(),
});

const filtersSchema = z.object({
  species: speciesEnum.optional(),
  neuterStatus: neuterEnum.optional(),
  needs: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',') : v),
    z.array(needsEnum).optional(),
  ),
});

const nearbySchema = filtersSchema.extend({
  lng: z.coerce.number(),
  lat: z.coerce.number(),
  radius: z.coerce.number().positive().max(50_000).default(2000),
});

const neuterPatchSchema = z.object({ neuterStatus: neuterEnum });

const statsPatchSchema = z.object({
  estimatedCount: z.number().int().min(0).optional(),
  neuterStatus: neuterEnum.optional(),
  needs: z.array(needsEnum).optional(),
  feedingSchedule: z.string().max(280).nullable().optional(),
  changedBy: z.string().max(140).optional(),
  note: z.string().max(500).optional(),
}).refine(
  (d) =>
    d.estimatedCount !== undefined ||
    d.neuterStatus !== undefined ||
    d.needs !== undefined ||
    d.feedingSchedule !== undefined,
  { message: 'informe ao menos um campo para atualizar' },
);

const postTypeEnum = z.enum([
  'update', 'need', 'photo', 'question', 'donation_offer', 'action_done',
]);

const postCreateSchema = z.object({
  body: z.string().min(1).max(2000),
  postType: postTypeEnum.optional(),
  authorName: z.string().max(140).optional(),
  authorContact: z.string().max(140).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
});

export function buildColoniesRouter(
  repo = new ColonyRepository(),
  posts = new ColonyPostRepository(),
): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = filtersSchema.safeParse(req.query);
      if (!parsed.success) throw new BadRequestError('filtros inválidos', parsed.error.flatten());
      res.json(await repo.listAll(parsed.data));
    }),
  );

  router.get(
    '/nearby',
    asyncHandler(async (req, res) => {
      const parsed = nearbySchema.safeParse(req.query);
      if (!parsed.success) throw new BadRequestError('parâmetros inválidos', parsed.error.flatten());
      const { lng, lat, radius, ...filters } = parsed.data;
      res.json(await repo.findNearby({ lng, lat }, radius, filters));
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
        estimatedCount: d.estimatedCount,
        neuterStatus: d.neuterStatus,
        caretakerName: d.caretakerName,
        contactPhone: d.contactPhone,
        contactEmail: d.contactEmail,
        feedingSchedule: d.feedingSchedule,
        needs: d.needs,
        imageUrl: d.imageUrl,
        createdBy: req.user?.id,
      });
      res.status(201).json(created);
    }),
  );

  router.patch(
    '/:id/neuter',
    optionalAuthMiddleware(),
    asyncHandler(async (req, res) => {
      const parsed = neuterPatchSchema.safeParse(req.body);
      if (!parsed.success) throw new BadRequestError('payload inválido');
      await repo.updateNeuterStatus(req.params.id!, parsed.data.neuterStatus);
      res.status(204).end();
    }),
  );

  // ============= DETALHE + FÓRUM =============
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const colony = await repo.findById(req.params.id!);
      if (!colony) throw new NotFoundError('Colônia não encontrada');
      res.json(colony);
    }),
  );

  router.patch(
    '/:id/stats',
    optionalAuthMiddleware(),
    asyncHandler(async (req, res) => {
      const parsed = statsPatchSchema.safeParse(req.body);
      if (!parsed.success) throw new BadRequestError('payload inválido', parsed.error.flatten());
      const id = req.params.id!;
      const updated = await repo.updateStats(id, parsed.data);
      // post automático de auditoria, para a comunidade ver o histórico
      const parts: string[] = [];
      if (parsed.data.estimatedCount !== undefined)
        parts.push(`contagem atualizada para ~${parsed.data.estimatedCount} animais`);
      if (parsed.data.neuterStatus !== undefined)
        parts.push(`status de castração: ${parsed.data.neuterStatus}`);
      if (parsed.data.needs !== undefined)
        parts.push(`necessidades atualizadas (${parsed.data.needs.length})`);
      if (parsed.data.feedingSchedule !== undefined)
        parts.push('rotina de alimentação atualizada');
      const note = parsed.data.note ? ` — ${parsed.data.note}` : '';
      await posts.create({
        colonyId: id,
        authorName: parsed.data.changedBy,
        postType: 'update',
        body: `📊 ${parts.join('; ')}${note}`,
        createdBy: req.user?.id,
      });
      res.json(updated);
    }),
  );

  router.get(
    '/:id/posts',
    asyncHandler(async (req, res) => {
      res.json(await posts.list(req.params.id!));
    }),
  );

  router.post(
    '/:id/posts',
    optionalAuthMiddleware(),
    asyncHandler(async (req, res) => {
      const parsed = postCreateSchema.safeParse(req.body);
      if (!parsed.success) throw new BadRequestError('payload inválido', parsed.error.flatten());
      const created = await posts.create({
        colonyId: req.params.id!,
        body: parsed.data.body,
        postType: parsed.data.postType,
        authorName: parsed.data.authorName,
        authorContact: parsed.data.authorContact,
        photos: parsed.data.photos,
        createdBy: req.user?.id,
      });
      res.status(201).json(created);
    }),
  );

  return router;
}
