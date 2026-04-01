import { IsInt, IsString, Min } from "class-validator";

export class MoveCardDto {
  @IsString()
  fromListId!: string;

  @IsString()
  toListId!: string;

  @IsInt()
  @Min(0)
  position!: number;
}
