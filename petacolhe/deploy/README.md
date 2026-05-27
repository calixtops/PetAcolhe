# Deploy do PetAcolhe em `server-plataform`

Tudo isolado do `vortex-backend`. Postgres do petacolhe roda **só na rede do Docker**
(sem porta pública); a API responde apenas em `127.0.0.1:4002`. O Nginx existente
no servidor (que já hospeda `vortex-api.conf`) ganha um vhost novo.

## Pré-requisitos no servidor (já validados)
- Docker 24+ ✅
- docker-compose v1.25 ✅
- Nginx ✅
- SSH com chave configurado (`ssh server-plataform`) ✅

## Estrutura no servidor

```
/srv/petacolhe/
├── api/         # código + deploy/docker-compose.prod.yml + deploy/.env
├── web/dist/    # build estático (nginx serve)
├── uploads/     # fotos das colônias (volume montado)
└── pgdata/      # volume do Postgres
```

## Passo a passo (primeira vez)

1) **Configure DNS** (opcional, dá pra começar só com IP):
   Aponte `petacolhe.vortexmundus.com` para o IP do servidor.

2) **Crie o .env.prod no servidor** com secrets reais:
   ```bash
   ssh server-plataform 'sudo mkdir -p /srv/petacolhe/api/deploy && sudo chown $USER /srv/petacolhe -R'
   # copia template e edita
   scp deploy/.env.prod.example server-plataform:/srv/petacolhe/api/deploy/.env
   ssh server-plataform 'nano /srv/petacolhe/api/deploy/.env'   # troque senhas!
   ```

   Gere um JWT forte assim:
   ```bash
   openssl rand -hex 64
   ```

3) **Suba o stack** (a partir da máquina de dev):
   ```bash
   bash deploy/deploy.sh
   ```

4) **Rode as migrations** (só na primeira vez):
   ```bash
   ssh server-plataform 'docker exec petacolhe_api npm run migrate --prefix /app/apps/petacolhe-api'
   ```

5) **Configure o Nginx** (uma vez):
   ```bash
   scp deploy/petacolhe.nginx.conf server-plataform:/tmp/
   ssh server-plataform '
     sudo mv /tmp/petacolhe.nginx.conf /etc/nginx/sites-available/petacolhe.conf &&
     sudo ln -sf /etc/nginx/sites-available/petacolhe.conf /etc/nginx/sites-enabled/ &&
     sudo nginx -t &&
     sudo systemctl reload nginx'
   ```

6) **HTTPS** (depois do DNS apontar):
   ```bash
   ssh server-plataform 'sudo certbot --nginx -d petacolhe.vortexmundus.com'
   ```

## Atualizações (depois do primeiro deploy)

```bash
bash deploy/deploy.sh
```

Faz rsync + `docker-compose up -d --build`. As migrations são idempotentes — se houver
nova migration, rode manualmente:
```bash
ssh server-plataform 'docker exec petacolhe_api npm run migrate --prefix /app/apps/petacolhe-api'
```

## Comandos úteis no servidor

```bash
# Ver logs da API
ssh server-plataform 'docker logs -f petacolhe_api'

# Ver logs do DB
ssh server-plataform 'docker logs -f petacolhe_db'

# Status
ssh server-plataform 'docker ps --filter name=petacolhe'

# Parar (não apaga dados)
ssh server-plataform 'cd /srv/petacolhe/api/deploy && docker-compose -f docker-compose.prod.yml down'

# Apagar TUDO (incluindo banco!)
ssh server-plataform 'cd /srv/petacolhe/api/deploy && docker-compose -f docker-compose.prod.yml down -v && sudo rm -rf /srv/petacolhe/pgdata'
```

## Não impacta o vortex-backend porque:

- Containers em rede própria `petacolhe-net`
- Postgres do petacolhe NÃO expõe porta no host (só rede Docker)
- API só escuta em `127.0.0.1:4002` (interface loopback)
- Nginx vhost separado (`petacolhe.conf`), `vortex-api.conf` intacto
- Uploads em pasta isolada `/srv/petacolhe/uploads/`
