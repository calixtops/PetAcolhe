-- =============================================================
-- Migração base compartilhada entre ZelaCid e PetAcolhe.
-- Extensão PostGIS + usuários + tabela genérica de pontos.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- USERS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- GEO_POINTS  (tabela genérica — herdada pelos módulos)
--
-- `kind` identifica a aplicação dona do ponto ('zelacid' | 'petacolhe' | ...).
-- `metadata` (JSONB) guarda campos livres do domínio quando não vale
-- a pena criar coluna dedicada.
-- A geometria é Point/4326 (WGS84). Coluna gerada `lng`/`lat` para
-- leitura conveniente sem precisar de ST_X/ST_Y.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geo_points (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind         TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  geom         GEOMETRY(Point, 4326) NOT NULL,
  lng          DOUBLE PRECISION GENERATED ALWAYS AS (ST_X(geom)) STORED,
  lat          DOUBLE PRECISION GENERATED ALWAYS AS (ST_Y(geom)) STORED,
  image_url    TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice espacial (essencial para ST_DWithin / ST_Intersects performáticos).
CREATE INDEX IF NOT EXISTS idx_geo_points_geom ON geo_points USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_geo_points_kind ON geo_points (kind);
CREATE INDEX IF NOT EXISTS idx_geo_points_metadata ON geo_points USING GIN (metadata);

-- -------------------------------------------------------------
-- Trigger utilitário para updated_at
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_geo_points_updated ON geo_points;
CREATE TRIGGER trg_geo_points_updated BEFORE UPDATE ON geo_points
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =============================================================
-- Exemplo de query espacial:
--   Buscar todos os pontos do tipo 'petacolhe' num raio de 2000m
--   da coordenada (-3.7327, -38.5267) [Fortaleza/CE].
--
-- SELECT id, title, lng, lat,
--        ST_Distance(geom::geography,
--                    ST_SetSRID(ST_MakePoint(-38.5267, -3.7327), 4326)::geography
--        ) AS distance_m
-- FROM geo_points
-- WHERE kind = 'petacolhe'
--   AND ST_DWithin(
--         geom::geography,
--         ST_SetSRID(ST_MakePoint(-38.5267, -3.7327), 4326)::geography,
--         2000
--       )
-- ORDER BY distance_m ASC;
-- =============================================================
