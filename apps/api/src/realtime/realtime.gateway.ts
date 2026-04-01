import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { BoardsService } from "../boards/boards.service";
import { MoveCardDto } from "../boards/dto/move-card.dto";

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true
  }
})
export class BoardGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly boardsService: BoardsService) {}

  async broadcastBoardUpdate(boardId: string, type: string) {
    const board = await this.boardsService.getBoard(boardId);

    this.server.to(boardId).emit("board:updated", {
      type,
      board
    });
  }

  @SubscribeMessage("board:join")
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string }
  ) {
    client.join(payload.boardId);
    return this.boardsService.getBoard(payload.boardId);
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
    const movement = await this.boardsService.moveCard(
      payload.boardId,
      payload.cardId,
      payload.move
    );

    client.to(payload.boardId).emit("card:moved", movement);
    await this.broadcastBoardUpdate(payload.boardId, "card:moved");

    return movement;
  }
}
