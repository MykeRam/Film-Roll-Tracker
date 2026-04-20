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

CREATE TABLE IF NOT EXISTS roll_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_id uuid NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL CHECK (file_size >= 0),
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roll_uploads_roll_id_idx ON roll_uploads (roll_id);
CREATE INDEX IF NOT EXISTS roll_uploads_user_id_idx ON roll_uploads (user_id);

CREATE TABLE IF NOT EXISTS roll_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_id uuid REFERENCES rolls(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roll_activity_roll_id_idx ON roll_activity (roll_id);
CREATE INDEX IF NOT EXISTS roll_activity_user_id_idx ON roll_activity (user_id);
CREATE INDEX IF NOT EXISTS roll_activity_created_at_idx ON roll_activity (created_at DESC);
