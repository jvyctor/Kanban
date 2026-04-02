import { Injectable } from "@nestjs/common";

@Injectable()
export class BoardPresenceService {
  private readonly boardSockets = new Map<string, Map<string, Set<string>>>();
  private readonly socketBoards = new Map<string, Array<{ boardId: string; userId: string }>>();

  setOnline(boardId: string, userId: string, socketId: string) {
    const boardUsers = this.boardSockets.get(boardId) ?? new Map<string, Set<string>>();
    const userSockets = boardUsers.get(userId) ?? new Set<string>();

    userSockets.add(socketId);
    boardUsers.set(userId, userSockets);
    this.boardSockets.set(boardId, boardUsers);

    const entries = this.socketBoards.get(socketId) ?? [];
    const alreadyTracked = entries.some((entry) => entry.boardId === boardId && entry.userId === userId);
    if (!alreadyTracked) {
      entries.push({ boardId, userId });
      this.socketBoards.set(socketId, entries);
    }
  }

  removeSocket(socketId: string) {
    const entries = this.socketBoards.get(socketId) ?? [];
    const affectedBoards = new Set<string>();

    entries.forEach(({ boardId, userId }) => {
      const boardUsers = this.boardSockets.get(boardId);
      const userSockets = boardUsers?.get(userId);

      if (!boardUsers || !userSockets) {
        return;
      }

      userSockets.delete(socketId);

      if (userSockets.size === 0) {
        boardUsers.delete(userId);
      }

      if (boardUsers.size === 0) {
        this.boardSockets.delete(boardId);
      }

      affectedBoards.add(boardId);
    });

    this.socketBoards.delete(socketId);
    return [...affectedBoards];
  }

  isOnline(boardId: string, userId: string) {
    return this.boardSockets.get(boardId)?.has(userId) ?? false;
  }
}
