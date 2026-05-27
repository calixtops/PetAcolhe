import cors from 'cors';
import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from '@core/backend';
import { buildAuthRouter } from './modules/auth/auth.routes.js';
import { buildColoniesRouter } from './modules/colonies/colonies.routes.js';
import { buildAdoptionsRouter } from './modules/adoptions/adoptions.routes.js';
import { buildMissingRouter } from './modules/missing/missing.routes.js';
import { buildPartnersRouter } from './modules/partners/partners.routes.js';
import { buildUploadsRouter, UPLOAD_DIR } from './modules/uploads/uploads.routes.js';
import { buildFeedRouter } from './modules/feed/feed.routes.js';

export function buildApp(publicBaseUrl: string): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  // Em dev, servimos /uploads do disco. Em prod (Vercel Blob), as URLs já são absolutas.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
  }

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'petacolhe-api' }));

  app.use('/auth', buildAuthRouter());
  app.use('/colonies', buildColoniesRouter());
  app.use('/adoptions', buildAdoptionsRouter());
  app.use('/missing', buildMissingRouter());
  app.use('/partners', buildPartnersRouter());
  app.use('/uploads-api', buildUploadsRouter(publicBaseUrl));
  app.use('/feed', buildFeedRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
