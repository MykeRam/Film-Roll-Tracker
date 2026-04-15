CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  camera text NOT NULL,
  lens text NOT NULL,
  film_stock text NOT NULL,
  iso integer NOT NULL,
  status text NOT NULL CHECK (status IN ('loaded', 'shot', 'developed', 'scanned')),
  date_loaded date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rolls_user_id_idx ON rolls (user_id);
CREATE INDEX IF NOT EXISTS rolls_status_idx ON rolls (status);

