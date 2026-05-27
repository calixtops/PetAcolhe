-- =============================================================
-- PetAcolhe — proteção animal
-- Estende geo_points com kinds:
--   'petacolhe:colony'   -> colônias de animais
--   'petacolhe:missing'  -> animais desaparecidos
-- =============================================================

CREATE TYPE pet_species AS ENUM ('cat', 'dog', 'other');

CREATE TYPE pet_neuter_status AS ENUM ('none', 'partial', 'in_progress', 'complete');

CREATE TABLE IF NOT EXISTS pet_colonies (
  geo_point_id     UUID PRIMARY KEY REFERENCES geo_points(id) ON DELETE CASCADE,
  species          pet_species NOT NULL,
  estimated_count  INTEGER     NOT NULL CHECK (estimated_count >= 0),
  neuter_status    pet_neuter_status NOT NULL DEFAULT 'none',
  caretaker_name   TEXT,
  contact_phone    TEXT
);

CREATE INDEX IF NOT EXISTS idx_pet_colonies_species ON pet_colonies (species);
CREATE INDEX IF NOT EXISTS idx_pet_colonies_neuter  ON pet_colonies (neuter_status);

-- Animais para adoção (não exige geom obrigatoriamente — usa local de resgate).
CREATE TABLE IF NOT EXISTS pet_adoptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geo_point_id  UUID REFERENCES geo_points(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  species       pet_species NOT NULL,
  age_months    INTEGER,
  description   TEXT,
  image_url     TEXT,
  is_neutered   BOOLEAN NOT NULL DEFAULT FALSE,
  is_adopted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_adoptions_status ON pet_adoptions (is_adopted);

-- Alertas de desaparecimento — estende geo_points (kind = 'petacolhe:missing').
CREATE TABLE IF NOT EXISTS pet_missing_alerts (
  geo_point_id  UUID PRIMARY KEY REFERENCES geo_points(id) ON DELETE CASCADE,
  species       pet_species NOT NULL,
  pet_name      TEXT NOT NULL,
  last_seen_at  TIMESTAMPTZ NOT NULL,
  is_found      BOOLEAN NOT NULL DEFAULT FALSE,
  contact_phone TEXT
);

CREATE INDEX IF NOT EXISTS idx_pet_missing_found ON pet_missing_alerts (is_found);
