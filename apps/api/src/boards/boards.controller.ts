import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CreateCardDto } from "./dto/create-card.dto";
import { CreateListDto } from "./dto/create-list.dto";
import { MoveCardDto } from "./dto/move-card.dto";
import { UpdateCardDto } from "./dto/update-card.dto";
import { UpdateListDto } from "./dto/update-list.dto";
import { BoardsService } from "./boards.service";
import { BoardGateway } from "../realtime/realtime.gateway";

@Controller("boards")
export class BoardsController {
  constructor(
    private readonly boardsService: BoardsService,
    private readonly boardGateway: BoardGateway
  ) {}

  @Get(":boardId")
  async getBoard(@Param("boardId") boardId: string) {
    return this.boardsService.getBoard(boardId);
  }

  @Post(":boardId/lists")
  async createList(
    @Param("boardId") boardId: string,
    @Body() createListDto: CreateListDto
  ) {
    const list = await this.boardsService.createList(boardId, createListDto);
    await this.boardGateway.broadcastBoardUpdate(boardId, "list:created");
    return list;
  }

  @Patch(":boardId/lists/:listId")
  async updateList(
    @Param("boardId") boardId: string,
    @Param("listId") listId: string,
    @Body() updateListDto: UpdateListDto
  ) {
    const list = await this.boardsService.updateList(boardId, listId, updateListDto);
    await this.boardGateway.broadcastBoardUpdate(boardId, "list:updated");
    return list;
  }

  @Post(":boardId/cards")
  async createCard(
    @Param("boardId") boardId: string,
    @Body() createCardDto: CreateCardDto
  ) {
    const card = await this.boardsService.createCard(boardId, createCardDto);
    await this.boardGateway.broadcastBoardUpdate(boardId, "card:created");
    return card;
  }

  @Patch(":boardId/cards/:cardId")
  async updateCard(
    @Param("boardId") boardId: string,
    @Param("cardId") cardId: string,
    @Body() updateCardDto: UpdateCardDto
  ) {
    const card = await this.boardsService.updateCard(boardId, cardId, updateCardDto);
    await this.boardGateway.broadcastBoardUpdate(boardId, "card:updated");
    return card;
  }

  @Patch(":boardId/cards/:cardId/move")
  async moveCard(
    @Param("boardId") boardId: string,
    @Param("cardId") cardId: string,
    @Body() moveCardDto: MoveCardDto
  ) {
    const movement = await this.boardsService.moveCard(boardId, cardId, moveCardDto);
    await this.boardGateway.broadcastBoardUpdate(boardId, "card:moved");
    return movement;
  }
}
