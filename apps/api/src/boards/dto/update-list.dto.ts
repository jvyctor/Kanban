import { IsString, MinLength } from "class-validator";

export class UpdateListDto {
  @IsString()
  @MinLength(1)
  title!: string;
}
