import { IsString, MinLength } from "class-validator";

export class AcceptBoardInvitationDto {
  @IsString()
  @MinLength(16)
  token!: string;
}
