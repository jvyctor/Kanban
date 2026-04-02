CREATE TYPE app_role AS ENUM ('ADMIN', 'USER');

ALTER TABLE users
ADD COLUMN password_hash TEXT,
ADD COLUMN app_role app_role NOT NULL DEFAULT 'USER';

UPDATE users
SET password_hash = 'pending-reset'
WHERE password_hash IS NULL;

ALTER TABLE users
ALTER COLUMN password_hash SET NOT NULL;

CREATE TABLE sessions (
  id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMP(3) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX sessions_token_hash_key ON sessions(token_hash);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

ALTER TABLE sessions
ADD CONSTRAINT sessions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
