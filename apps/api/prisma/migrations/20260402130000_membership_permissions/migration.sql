ALTER TABLE "memberships"
ADD COLUMN "can_manage_members" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_invite_members" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_create_lists" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_edit_lists" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_create_cards" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_edit_cards" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_move_cards" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_comment" BOOLEAN NOT NULL DEFAULT true;

UPDATE "memberships"
SET
  "can_manage_members" = CASE WHEN "role" IN ('OWNER', 'ADMIN') THEN true ELSE false END,
  "can_invite_members" = CASE WHEN "role" IN ('OWNER', 'ADMIN') THEN true ELSE false END,
  "can_create_lists" = CASE WHEN "role" IN ('OWNER', 'ADMIN', 'MEMBER') THEN true ELSE false END,
  "can_edit_lists" = CASE WHEN "role" IN ('OWNER', 'ADMIN', 'MEMBER') THEN true ELSE false END,
  "can_create_cards" = CASE WHEN "role" IN ('OWNER', 'ADMIN', 'MEMBER') THEN true ELSE false END,
  "can_edit_cards" = CASE WHEN "role" IN ('OWNER', 'ADMIN', 'MEMBER') THEN true ELSE false END,
  "can_move_cards" = CASE WHEN "role" IN ('OWNER', 'ADMIN', 'MEMBER') THEN true ELSE false END,
  "can_comment" = CASE WHEN "role" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER') THEN true ELSE false END;
