-- 004_colony_forum.sql — fórum/timeline da comunidade por colônia
CREATE TYPE pet_colony_post_type AS ENUM (
  'update',         -- atualização geral
  'need',           -- pedido / necessidade urgente
  'photo',          -- só fotos
  'question',       -- pergunta para a comunidade
  'donation_offer', -- alguém oferecendo doação
  'action_done'     -- alguém fez uma ação (alimentou, levou ao vet)
);

CREATE TABLE pet_colony_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colony_id       uuid NOT NULL REFERENCES pet_colonies(geo_point_id) ON DELETE CASCADE,
  author_name     TEXT,
  author_contact  TEXT,
  post_type       pet_colony_post_type NOT NULL DEFAULT 'update',
  body            TEXT NOT NULL,
  photos          TEXT[] NOT NULL DEFAULT '{}',
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_colony_posts_colony_time
  ON pet_colony_posts(colony_id, created_at DESC);
