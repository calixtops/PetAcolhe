-- =============================================================
-- PetAcolhe v2 — Parceiros, interesses de adoção e campos extras
-- focados em facilitar adoção / doação / castração.
-- =============================================================

-- ---------- Colônias: campos para ajudar voluntários ----------
ALTER TABLE pet_colonies
  ADD COLUMN IF NOT EXISTS contact_email    TEXT,
  ADD COLUMN IF NOT EXISTS feeding_schedule TEXT,
  ADD COLUMN IF NOT EXISTS needs            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
-- needs: 'food','medicine','vet','castration','transport','shelter','volunteer'

-- ---------- Adoções: contato direto + flag de urgência ----------
ALTER TABLE pet_adoptions
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS is_urgent     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS city          TEXT;

CREATE TABLE IF NOT EXISTS pet_adoption_interests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adoption_id     UUID NOT NULL REFERENCES pet_adoptions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_email   TEXT,
  contact_phone   TEXT,
  message         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adoption_interests_adoption ON pet_adoption_interests (adoption_id);

-- ---------- Alertas de desaparecimento: contato direto ----------
ALTER TABLE pet_missing_alerts
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS reward        TEXT;

-- ---------- Parceiros (clínicas, ONGs, pet shops, doadores) ----------
CREATE TYPE pet_partner_type AS ENUM ('clinic', 'ngo', 'petshop', 'volunteer', 'donor', 'other');

-- Estende geo_points com kind='petacolhe:partner'
CREATE TABLE IF NOT EXISTS pet_partners (
  geo_point_id  UUID PRIMARY KEY REFERENCES geo_points(id) ON DELETE CASCADE,
  partner_type  pet_partner_type NOT NULL,
  services      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- 'castration','vaccine','consultation','adoption','food_donation','shelter','transport'
  contact_email TEXT,
  contact_phone TEXT,
  website       TEXT,
  free_services BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_pet_partners_type ON pet_partners (partner_type);
