import { AppRole } from "@prisma/client";
import { SetMetadata } from "@nestjs/common";

export const APP_ROLES_KEY = "app_roles";
export const RequireAppRoles = (...roles: AppRole[]) => SetMetadata(APP_ROLES_KEY, roles);
