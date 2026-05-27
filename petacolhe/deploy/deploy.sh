#!/usr/bin/env bash
# =============================================================
# deploy.sh — sincroniza código + sobe stack no servidor
# Rode da raiz do projeto:  bash deploy/deploy.sh
# =============================================================
set -euo pipefail

SSH_HOST="${SSH_HOST:-server-plataform}"
REMOTE_DIR="${REMOTE_DIR:-/srv/petacolhe}"
LOCAL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Local: $LOCAL_ROOT"
echo "==> Remoto: $SSH_HOST:$REMOTE_DIR"

# 1) Build do frontend localmente
echo "==> [1/4] Build do frontend"
( cd "$LOCAL_ROOT" && npm run build --workspace=petacolhe-web )

# 2) Garantir estrutura no servidor
echo "==> [2/4] Preparando estrutura remota"
ssh "$SSH_HOST" "sudo mkdir -p $REMOTE_DIR/{api,web,uploads,pgdata} && sudo chown -R \$USER:\$USER $REMOTE_DIR"

# 3) rsync de tudo que importa (sem node_modules, sem .git, sem dist da api)
echo "==> [3/4] Enviando código"
rsync -avz --delete \
  --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  --exclude '*.log' --exclude '.env' \
  --exclude 'apps/petacolhe-web/dist' \
  "$LOCAL_ROOT/" "$SSH_HOST:$REMOTE_DIR/api/"

# 3b) Build do web vai pra /srv/petacolhe/web/dist
rsync -avz --delete \
  "$LOCAL_ROOT/apps/petacolhe-web/dist/" "$SSH_HOST:$REMOTE_DIR/web/dist/"

# 4) Subir/recriar containers
echo "==> [4/4] Subindo containers"
ssh "$SSH_HOST" "cd $REMOTE_DIR/api/deploy && \
  if [ ! -f .env ]; then echo 'ERRO: $REMOTE_DIR/api/deploy/.env não existe. Copie do .env.prod.example e preencha.' && exit 1; fi && \
  cp .env .env.compose && \
  docker-compose -f docker-compose.prod.yml --env-file .env.compose up -d --build && \
  echo '--- containers ---' && \
  docker ps --filter name=petacolhe"

echo "==> Pronto."
echo "Próximo passo: rode as migrations uma vez:"
echo "  ssh $SSH_HOST 'docker exec petacolhe_api npm run migrate --prefix /app/apps/petacolhe-api'"
