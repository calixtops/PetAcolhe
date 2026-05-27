# PetAcolhe API

Backend Express/TypeScript do projeto de proteção animal.
Estende `geo_points` com `pet_colonies`, `pet_adoptions` e `pet_missing_alerts`.

## Endpoints

| Método | Rota                    | Auth | Descrição                                    |
| ------ | ----------------------- | ---- | -------------------------------------------- |
| POST   | /auth/register          | —    | Cria usuário                                 |
| POST   | /auth/login             | —    | Login → `{ user, token }`                    |
| GET    | /colonies               | —    | Lista colônias                               |
| GET    | /colonies/nearby        | —    | `?lng&lat&radius` (metros)                   |
| POST   | /colonies               | JWT  | Cria colônia (espécie, qtd estimada, etc.)   |
| PATCH  | /colonies/:id/neuter    | JWT  | Atualiza status de castração                 |

## Próximos módulos sugeridos
- `/adoptions` (CRUD de adoção, sem geom obrigatório)
- `/missing` (alertas de desaparecimento — kind `petacolhe:missing`)

## Rodar

```bash
docker compose up -d db
npm install
npm run migrate --workspace=@core/backend
npm run migrate --workspace=petacolhe-api
npm run dev --workspace=petacolhe-api
```
