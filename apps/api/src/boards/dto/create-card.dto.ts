import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateCardDto {
  @IsString()
  listId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assignee?: string;
}
