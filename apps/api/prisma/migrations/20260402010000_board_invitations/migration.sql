CREATE TABLE board_invitations (
  id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  invited_by_id TEXT NOT NULL,
  invited_user_id TEXT NOT NULL,
  invited_email TEXT NOT NULL,
  role board_role NOT NULL,
  token_hash TEXT NOT NULL,
  accepted_at TIMESTAMP(3),
  expires_at TIMESTAMP(3) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  CONSTRAINT board_invitations_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX board_invitations_token_hash_key ON board_invitations(token_hash);
CREATE INDEX board_invitations_board_id_idx ON board_invitations(board_id);
CREATE INDEX board_invitations_invited_user_id_idx ON board_invitations(invited_user_id);
CREATE INDEX board_invitations_expires_at_idx ON board_invitations(expires_at);

ALTER TABLE board_invitations
ADD CONSTRAINT board_invitations_board_id_fkey
FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE board_invitations
ADD CONSTRAINT board_invitations_invited_by_id_fkey
FOREIGN KEY (invited_by_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE board_invitations
ADD CONSTRAINT board_invitations_invited_user_id_fkey
FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
