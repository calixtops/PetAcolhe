# PetAcolhe 🐾

Aplicação geoespacial para proteção animal: mapa de **colônias** (com fórum por colônia),
**adoções**, **animais desaparecidos** e **parceiros** (clínicas, ONGs, protetores).

Stack: PostgreSQL 16 + PostGIS 3 · Node.js / TypeScript / Express · React / Vite / Leaflet.

## Estrutura

```
PetAcolhe/
├── docker-compose.yml          # PostgreSQL 16 + PostGIS 3
├── package.json                # npm workspaces
├── tsconfig.base.json
├── .env.example
├── packages/
│   ├── core-backend/           # Pool PG, GeoPointRepository, errors, auth helpers
│   └── core-frontend/          # <GeoMap/>, hooks, tipos compartilhados
└── apps/
    ├── petacolhe-api/          # Express + colonies/adoptions/missing/partners/uploads
    └── petacolhe-web/          # React + Vite — mapa, drawer de colônia, fórum
```

## Como rodar

```bash
cp .env.example .env
docker compose up -d db          # sobe PostGIS
npm install                      # instala workspaces
npm run migrate                  # aplica todas as migrations
npm run dev                      # API (4002) + web (5174) em paralelo
```

Abra **http://localhost:5174** e clique num pino de colônia para abrir o drawer com
estatísticas editáveis, multi-upload de fotos e a timeline do fórum.

## Endpoints principais (API em :4002)

| Recurso | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` |
| Colônias | `GET/POST /colonies`, `GET /colonies/:id`, `PATCH /colonies/:id/stats` |
| Fórum | `GET/POST /colonies/:id/posts` |
| Adoções | `GET/POST /adoptions` |
| Desaparecidos | `GET/POST /missing` |
| Parceiros | `GET/POST /partners` |
| Uploads | `POST /uploads-api` (multipart) · estáticos em `/uploads` |

## Variáveis de ambiente (.env)

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=geo_apps
POSTGRES_USER=geo
POSTGRES_PASSWORD=geo_dev_pw
JWT_SECRET=change-me-in-production
PETACOLHE_API_PORT=4002
```
