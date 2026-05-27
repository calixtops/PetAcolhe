import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, BadRequestError, UserService } from '@core/backend';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function buildAuthRouter(service = new UserService()): Router {
  const router = Router();

  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) throw new BadRequestError('payload inválido', parsed.error.flatten());
      const { email, password, displayName } = parsed.data;
      res.status(201).json(await service.register(email, password, displayName));
    }),
  );

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw new BadRequestError('payload inválido');
      res.json(await service.login(parsed.data.email, parsed.data.password));
    }),
  );

  return router;
}
