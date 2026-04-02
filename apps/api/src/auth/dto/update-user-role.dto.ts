import { AppRole } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateUserRoleDto {
  @IsEnum(AppRole)
  appRole!: AppRole;
}
