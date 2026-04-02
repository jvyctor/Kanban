import { BoardRole } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";

export class UpdateMemberPermissionsDto {
  @IsOptional()
  @IsEnum(BoardRole)
  role?: BoardRole;

  @IsOptional()
  @IsBoolean()
  canManageMembers?: boolean;

  @IsOptional()
  @IsBoolean()
  canInviteMembers?: boolean;

  @IsOptional()
  @IsBoolean()
  canCreateLists?: boolean;

  @IsOptional()
  @IsBoolean()
  canEditLists?: boolean;

  @IsOptional()
  @IsBoolean()
  canCreateCards?: boolean;

  @IsOptional()
  @IsBoolean()
  canEditCards?: boolean;

  @IsOptional()
  @IsBoolean()
  canMoveCards?: boolean;

  @IsOptional()
  @IsBoolean()
  canComment?: boolean;
}
