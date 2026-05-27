import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { errorHandler, notFoundHandler } from '@core/backend';
import { buildAuthRouter } from './modules/auth/auth.routes.js';
import { buildColoniesRouter } from './modules/colonies/colonies.routes.js';
import { buildAdoptionsRouter } from './modules/adoptions/adoptions.routes.js';
import { buildMissingRouter } from './modules/missing/missing.routes.js';
import { buildPartnersRouter } from './modules/partners/partners.routes.js';
import { buildUploadsRouter, UPLOAD_DIR } from './modules/uploads/uploads.routes.js';

const port = Number(process.env.PETACOLHE_API_PORT ?? 4002);
const publicBaseUrl = process.env.PETACOLHE_PUBLIC_URL ?? `http://localhost:${port}`;

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// arquivos enviados em /uploads/*
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'petacolhe-api' }));

app.use('/auth', buildAuthRouter());
app.use('/colonies', buildColoniesRouter());
app.use('/adoptions', buildAdoptionsRouter());
app.use('/missing', buildMissingRouter());
app.use('/partners', buildPartnersRouter());
app.use('/uploads-api', buildUploadsRouter(publicBaseUrl));

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[petacolhe-api] listening on ${publicBaseUrl}`);
});
