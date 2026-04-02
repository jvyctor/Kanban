import { ForbiddenException, UsePipes, ValidationPipe } from "@nestjs/common";
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
import { isCorsOriginAllowed } from "../config/runtime-config";
import { RealtimeRateLimitService } from "../security/realtime-rate-limit.service";
import { BoardJoinDto } from "./dto/board-join.dto";
import { MoveCardEventDto } from "./dto/move-card-event.dto";

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) => {
      if (isCorsOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin not allowed"));
    },
    credentials: true
  }
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true
  })
)
export class BoardGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly boardsService: BoardsService,
    private readonly authService: AuthService,
    private readonly presenceService: BoardPresenceService,
    private readonly realtimeRateLimitService: RealtimeRateLimitService
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
    @MessageBody() payload: BoardJoinDto
  ) {
    const currentUser = await this.resolveSocketUser(client);
    await this.boardsService.ensureBoardAccess(currentUser.id, payload.boardId);
    await this.realtimeRateLimitService.assertWithinLimit(
      "board-join",
      currentUser.id,
      payload.boardId
    );

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
    @MessageBody() payload: MoveCardEventDto
  ) {
    const currentUser = await this.resolveSocketUser(client);
    await this.realtimeRateLimitService.assertWithinLimit(
      "card-move",
      currentUser.id,
      payload.boardId
    );
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
