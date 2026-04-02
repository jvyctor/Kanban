import { Type } from "class-transformer";
import { IsString, MinLength, ValidateNested } from "class-validator";
import { MoveCardDto } from "../../boards/dto/move-card.dto";

export class MoveCardEventDto {
  @IsString()
  @MinLength(1)
  boardId!: string;

  @IsString()
  @MinLength(1)
  cardId!: string;

  @ValidateNested()
  @Type(() => MoveCardDto)
  move!: MoveCardDto;
}
