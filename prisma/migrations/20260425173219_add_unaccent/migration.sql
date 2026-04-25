CREATE EXTENSION IF NOT EXISTS unaccent;

-- Función wrapper IMMUTABLE para poder usar en índices
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$
  SELECT unaccent($1);
$$;

-- Ahora sí puede usarse en el índice
CREATE INDEX idx_exercise_name_unaccent 
  ON "Exercise" (immutable_unaccent(lower(name)));