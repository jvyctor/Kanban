import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUserDecorator } from "../auth/decorators/current-user.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../auth/current-user.interface";
import { CreateCardDto } from "./dto/create-card.dto";
import { CreateCardCommentDto } from "./dto/create-card-comment.dto";
import { AcceptBoardInvitationDto } from "./dto/accept-board-invitation.dto";
import { CreateBoardInvitationDto } from "./dto/create-board-invitation.dto";
import { CreateListDto } from "./dto/create-list.dto";
import { MoveCardDto } from "./dto/move-card.dto";
import { UpdateMemberPermissionsDto } from "./dto/update-member-permissions.dto";
import { UpdateCardDto } from "./dto/update-card.dto";
import { UpdateListDto } from "./dto/update-list.dto";
import { BoardsService } from "./boards.service";
import { BoardGateway } from "../realtime/realtime.gateway";

@UseGuards(AuthGuard)
@Controller("boards")
export class BoardsController {
  constructor(
    private readonly boardsService: BoardsService,
    private readonly boardGateway: BoardGateway
  ) {}

  @Get()
  async listBoards(@CurrentUserDecorator() currentUser: CurrentUser) {
    return {
      boards: await this.boardsService.listBoards(currentUser.id)
    };
  }

  @Get("dashboard")
  async getDashboard(@CurrentUserDecorator() currentUser: CurrentUser) {
    return this.boardsService.getDashboard(currentUser.id);
  }

  @Get(":boardId")
  async getBoard(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param("boardId") boardId: string
  ) {
    return this.boardsService.getBoard(currentUser.id, boardId);
  }

  @Post(":boardId/invitations")
  async inviteUser(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param("boardId") boardId: string,
    @Body() createBoardInvitationDto: CreateBoardInvitationDto
  ) {
    const invitation = await this.boardsService.inviteUserToBoard(
      currentUser,
      boardId,
      createBoardInvitationDto
    );
    await this.boardGateway.broadcastBoardUpdate(boardId, "invitation:created");
    return invitation;
  }

  @Post("invitations/accept")
  async acceptInvitation(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() acceptBoardInvitationDto: AcceptBoardInvitationDto
  ) {
    const board = await this.boardsService.acceptInvitation(
      currentUser,
      acceptBoardInvitationDto
    );
    await this.boardGateway.broadcastBoardUpdate(board.id, "invitation:accepted");
    return board;
  }

  @Patch(":boardId/members/:memberId/permissions")
  async updateMemberPermissions(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param("boardId") boardId: string,
    @Param("memberId") memberId: string,
    @Body() updateMemberPermissionsDto: UpdateMemberPermissionsDto
  ) {
    const board = await this.boardsService.updateMemberPermissions(
      currentUser,
      boardId,
      memberId,
      updateMemberPermissionsDto
    );
    await this.boardGateway.broadcastBoardUpdate(boardId, "member:permissions-updated");
    return board;
  }

  @Post(":boardId/lists")
  async createList(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param("boardId") boardId: string,
    @Body() createListDto: CreateListDto
  ) {
    const list = await this.boardsService.createList(currentUser.id, boardId, createListDto);
    await this.boardGateway.broadcastBoardUpdate(boardId, "list:created");
    return list;
  }

  @Patch(":boardId/lists/:listId")
  async updateList(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param("boardId") boardId: string,
    @Param("listId") listId: string,
    @Body() updateListDto: UpdateListDto
  ) {
    const list = await this.boardsService.updateList(
      currentUser.id,
      boardId,
      listId,
      updateListDto
    );
    await this.boardGateway.broadcastBoardUpdate(boardId, "list:updated");
    return list;
  }

  @Post(":boardId/cards")
  async createCard(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param("boardId") boardId: string,
    @Body() createCardDto: CreateCardDto
  ) {
    const card = await this.boardsService.createCard(currentUser.id, boardId, createCardDto);
    await this.boardGateway.broadcastBoardUpdate(boardId, "card:created");
    return card;
  }

  @Patch(":boardId/cards/:cardId")
  async updateCard(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param("boardId") boardId: string,
    @Param("cardId") cardId: string,
    @Body() updateCardDto: UpdateCardDto
  ) {
    const card = await this.boardsService.updateCard(
      currentUser.id,
      boardId,
      cardId,
      updateCardDto
    );
    await this.boardGateway.broadcastBoardUpdate(boardId, "card:updated");
    return card;
  }

  @Post(":boardId/cards/:cardId/comments")
  async addComment(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param("boardId") boardId: string,
    @Param("cardId") cardId: string,
    @Body() createCardCommentDto: CreateCardCommentDto
  ) {
    const comment = await this.boardsService.addCommentToCard(
      currentUser,
      boardId,
      cardId,
      createCardCommentDto
    );
    await this.boardGateway.broadcastBoardUpdate(boardId, "card:commented");
    return comment;
  }

  @Patch(":boardId/cards/:cardId/move")
  async moveCard(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param("boardId") boardId: string,
    @Param("cardId") cardId: string,
    @Body() moveCardDto: MoveCardDto
  ) {
    const movement = await this.boardsService.moveCard(
      currentUser.id,
      boardId,
      cardId,
      moveCardDto
    );
    await this.boardGateway.broadcastBoardUpdate(boardId, "card:moved");
    return movement;
  }
}
