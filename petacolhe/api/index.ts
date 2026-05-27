// Entry point para Vercel Serverless Functions.
// Tudo que chega em /api/* é roteado pelo Express já existente.
import { buildApp } from '../apps/petacolhe-api/src/app.js';

const publicBaseUrl = process.env.PETACOLHE_PUBLIC_URL ?? '';
const app = buildApp(publicBaseUrl);

export default app;
