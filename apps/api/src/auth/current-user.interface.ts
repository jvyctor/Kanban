import { AppRole } from "@prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  appRole: AppRole;
};
