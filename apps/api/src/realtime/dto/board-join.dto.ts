import { IsString, MinLength } from "class-validator";

export class BoardJoinDto {
  @IsString()
  @MinLength(1)
  boardId!: string;
}
