import 'dotenv/config';
import { buildApp } from './app.js';

const port = Number(process.env.PETACOLHE_API_PORT ?? 4002);
const publicBaseUrl = process.env.PETACOLHE_PUBLIC_URL ?? `http://localhost:${port}`;

const app = buildApp(publicBaseUrl);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[petacolhe-api] listening on ${publicBaseUrl}`);
});
