# Deploy PetAcolhe — Vercel + Neon Postgres + Vercel Blob

Tudo serverless e grátis (no MVP).

## Visão geral

```
[Vercel]
 ├─ Frontend  (apps/petacolhe-web/dist)
 ├─ API      (api/index.ts → Express)  ──► [Neon Postgres com PostGIS]
 └─ Uploads  (@vercel/blob)             ──► [Vercel Blob Storage]
```

## Passo 1 — Criar banco no Neon

1. Vá em https://neon.tech e crie conta (login com GitHub).
2. **Create Project** → nome `petacolhe` → região mais próxima (São Paulo / us-east-2).
3. Ative a extensão PostGIS: no console SQL do Neon, execute:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
4. Copie a **Connection string** (formato `postgresql://user:pass@host/db?sslmode=require`).

## Passo 2 — Rodar migrations no Neon

Localmente, com a connection string:
```bash
cd /home/calixtops/Documentos/Projetos_startup/petacolhe
export DATABASE_URL="postgresql://...neon.tech/...?sslmode=require"
npm run migrate
```

Vai criar tabelas base + petacolhe + partners + colony_forum.

## Passo 3 — Criar projeto na Vercel

1. https://vercel.com → **Add New Project** → importe o repo do GitHub.
2. **Root Directory**: `petacolhe` (se o repo tiver mais coisa fora).
3. Vercel detecta o `vercel.json` — não precisa configurar Build/Output.
4. Antes do primeiro deploy, vá em **Environment Variables** e adicione:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | conn string do Neon (com `?sslmode=require`) |
   | `JWT_SECRET` | gere com `openssl rand -hex 64` |
   | `BLOB_READ_WRITE_TOKEN` | (preenche no passo 4) |

5. Deploy → vai falhar nos uploads até a próxima etapa, o resto funciona.

## Passo 4 — Criar Vercel Blob Store

1. No dashboard do projeto Vercel → aba **Storage** → **Create Database** → **Blob**.
2. Conecte ao projeto.
3. Vercel cria automaticamente a env var `BLOB_READ_WRITE_TOKEN`. Confirme em
   Environment Variables → ela já existe.
4. **Redeploy** (Deployments → último → ··· → Redeploy).

## Passo 5 — Domínio (opcional)

Por padrão a Vercel dá um `pet-acolhe.vercel.app`. Pra usar domínio próprio:
**Settings → Domains → Add** → segue o wizard de DNS.

## Atualizações

Cada `git push` no branch `main` faz deploy automático.
Para mudar schema: crie nova migration em `apps/petacolhe-api/src/db/migrations/`
e rode localmente com `DATABASE_URL` apontando pro Neon antes do deploy.

## Debug rápido

- **Logs**: dashboard Vercel → projeto → Deployments → clique no deploy → "Functions"
- **DB**: console SQL do Neon → roda queries direto
- **Health**: `https://pet-acolhe.vercel.app/api/health` deve retornar `{"ok":true}`

## Custo

- **Vercel Hobby**: grátis (100GB-hours/mês de função)
- **Neon Free**: 0.5GB de storage, 191h compute/mês
- **Vercel Blob Free**: 5GB armazenamento, 100k operações/mês

Suficiente pra MVP com centenas de colônias e milhares de visitas/mês.
