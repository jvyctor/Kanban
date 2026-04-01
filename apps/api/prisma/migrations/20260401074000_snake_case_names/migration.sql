ALTER TYPE "BoardRole" RENAME TO board_role;

ALTER TABLE "User" RENAME TO users;
ALTER TABLE "Board" RENAME TO boards;
ALTER TABLE "Membership" RENAME TO memberships;
ALTER TABLE "BoardList" RENAME TO board_lists;
ALTER TABLE "Card" RENAME TO cards;

ALTER TABLE users RENAME COLUMN "displayName" TO display_name;
ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at;

ALTER TABLE boards RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE boards RENAME COLUMN "updatedAt" TO updated_at;

ALTER TABLE memberships RENAME COLUMN "boardId" TO board_id;
ALTER TABLE memberships RENAME COLUMN "userId" TO user_id;
ALTER TABLE memberships RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE board_lists RENAME COLUMN "boardId" TO board_id;
ALTER TABLE board_lists RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE board_lists RENAME COLUMN "updatedAt" TO updated_at;

ALTER TABLE cards RENAME COLUMN "dueDate" TO due_date;
ALTER TABLE cards RENAME COLUMN "listId" TO list_id;
ALTER TABLE cards RENAME COLUMN "assigneeId" TO assignee_id;
ALTER TABLE cards RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE cards RENAME COLUMN "updatedAt" TO updated_at;

ALTER INDEX "User_pkey" RENAME TO users_pkey;
ALTER INDEX "User_email_key" RENAME TO users_email_key;

ALTER INDEX "Board_pkey" RENAME TO boards_pkey;

ALTER INDEX "Membership_pkey" RENAME TO memberships_pkey;
ALTER INDEX "Membership_boardId_userId_key" RENAME TO memberships_board_id_user_id_key;

ALTER INDEX "BoardList_pkey" RENAME TO board_lists_pkey;
ALTER INDEX "BoardList_boardId_position_key" RENAME TO board_lists_board_id_position_key;

ALTER INDEX "Card_pkey" RENAME TO cards_pkey;
ALTER INDEX "Card_listId_position_key" RENAME TO cards_list_id_position_key;

ALTER TABLE memberships RENAME CONSTRAINT "Membership_boardId_fkey" TO memberships_board_id_fkey;
ALTER TABLE memberships RENAME CONSTRAINT "Membership_userId_fkey" TO memberships_user_id_fkey;
ALTER TABLE board_lists RENAME CONSTRAINT "BoardList_boardId_fkey" TO board_lists_board_id_fkey;
ALTER TABLE cards RENAME CONSTRAINT "Card_listId_fkey" TO cards_list_id_fkey;
ALTER TABLE cards RENAME CONSTRAINT "Card_assigneeId_fkey" TO cards_assignee_id_fkey;
