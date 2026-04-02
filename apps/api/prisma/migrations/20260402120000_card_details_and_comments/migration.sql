CREATE TYPE "card_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TABLE "cards"
ADD COLUMN "priority" "card_priority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "card_comments" (
  "id" TEXT NOT NULL,
  "card_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "card_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "card_comments_card_id_idx" ON "card_comments"("card_id");
CREATE INDEX "card_comments_user_id_idx" ON "card_comments"("user_id");

ALTER TABLE "card_comments"
ADD CONSTRAINT "card_comments_card_id_fkey"
FOREIGN KEY ("card_id") REFERENCES "cards"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "card_comments"
ADD CONSTRAINT "card_comments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
