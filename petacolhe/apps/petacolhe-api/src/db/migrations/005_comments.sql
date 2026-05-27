-- 005_comments.sql — comentários polimórficos (estilo Twitter/Insta).
-- Um único modelo serve para perguntas em adoções, dúvidas em desaparecidos,
-- comentários em colônias e respostas a posts de colônia.

CREATE TABLE IF NOT EXISTS pet_comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind     text NOT NULL CHECK (target_kind IN ('adoption', 'missing', 'colony', 'colony_post')),
  target_id       uuid NOT NULL,
  author_name     text,
  author_contact  text,
  body            text NOT NULL CHECK (length(trim(body)) > 0),
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_comments_target
  ON pet_comments (target_kind, target_id, created_at DESC);
