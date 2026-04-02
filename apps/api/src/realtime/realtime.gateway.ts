import { ForbiddenException } from "@nestjs/common";
import { OnGatewayDisconnect } from "@nestjs/websockets";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service";
import { BoardPresenceService } from "../boards/board-presence.service";
import { BoardsService } from "../boards/boards.service";
import { MoveCardDto } from "../boards/dto/move-card.dto";

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true
  }
})
export class BoardGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly boardsService: BoardsService,
    private readonly authService: AuthService,
    private readonly presenceService: BoardPresenceService
  ) {}

  async broadcastBoardUpdate(boardId: string, type: string) {
    const membership = await this.server.in(boardId).fetchSockets();
    const userIds = new Set<string>();

    membership.forEach((socket) => {
      const userId = socket.data.userId as string | undefined;
      if (userId) {
        userIds.add(userId);
      }
    });

    await Promise.all(
      [...userIds].map(async (userId) => {
        const board = await this.boardsService.getBoard(userId, boardId);
        this.server.to(`user:${userId}`).emit("board:updated", {
          type,
          board
        });
      })
    );
  }

  @SubscribeMessage("board:join")
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string }
  ) {
    const currentUser = await this.resolveSocketUser(client);
    await this.boardsService.ensureBoardAccess(currentUser.id, payload.boardId);

    client.data.userId = currentUser.id;
    this.presenceService.setOnline(payload.boardId, currentUser.id, client.id);
    client.join(`user:${currentUser.id}`);
    client.join(payload.boardId);
    await this.broadcastBoardUpdate(payload.boardId, "presence:updated");
    return this.boardsService.getBoard(currentUser.id, payload.boardId);
  }

  @SubscribeMessage("card:move")
  async handleMoveCard(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      boardId: string;
      cardId: string;
      move: MoveCardDto;
    }
  ) {
    const currentUser = await this.resolveSocketUser(client);
    const movement = await this.boardsService.moveCard(
      currentUser.id,
      payload.boardId,
      payload.cardId,
      payload.move
    );

    client.to(payload.boardId).emit("card:moved", movement);
    await this.broadcastBoardUpdate(payload.boardId, "card:moved");

    return movement;
  }

  async handleDisconnect(client: Socket) {
    const affectedBoards = this.presenceService.removeSocket(client.id);

    await Promise.all(
      affectedBoards.map(async (boardId) => {
        await this.broadcastBoardUpdate(boardId, "presence:updated");
      })
    );
  }

  private async resolveSocketUser(client: Socket) {
    const currentUser = await this.authService.getCurrentUserFromHeaders(
      client.handshake.headers as Record<string, string | string[] | undefined>
    );

    if (!currentUser) {
      throw new ForbiddenException("Authentication required");
    }

    return currentUser;
  }
}
