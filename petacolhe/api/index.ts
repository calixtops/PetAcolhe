// Entry point para Vercel Serverless Functions.
// Tudo que chega em /api/* é roteado pelo Express já existente.
import express from 'express';
import { buildApp } from '../apps/petacolhe-api/src/app.js';

const publicBaseUrl = process.env.PETACOLHE_PUBLIC_URL ?? '';
const innerApp = buildApp(publicBaseUrl);

// A Vercel preserva o prefixo /api ao chamar a função.
// Montamos o app sob /api para as rotas internas (/health, /colonies, etc.) baterem igual em dev e prod.
const app = express();
app.use('/api', innerApp);

export default app;
