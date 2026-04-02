import { BoardRole } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional } from "class-validator";

export class CreateBoardInvitationDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(BoardRole)
  role?: BoardRole;
}
