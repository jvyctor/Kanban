import {
  Injectable,
  NotFoundException,
  OnModuleInit
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCardDto } from "./dto/create-card.dto";
import { CreateListDto } from "./dto/create-list.dto";
import type { MoveCardDto } from "./dto/move-card.dto";
import { UpdateCardDto } from "./dto/update-card.dto";
import { UpdateListDto } from "./dto/update-list.dto";

type BoardCardView = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  position: number;
};

type BoardListView = {
  id: string;
  title: string;
  position: number;
  cards: BoardCardView[];
};

export type BoardView = {
  id: string;
  title: string;
  lists: BoardListView[];
};

const DEMO_BOARD_ID = "demo";

@Injectable()
export class BoardsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDemoBoard();
  }

  async getBoard(boardId: string) {
    await this.ensureDemoBoard();

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
              include: {
                assignee: {
                  select: {
                    displayName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!board) {
      throw new NotFoundException("Board not found");
    }

    return this.mapBoard(board);
  }

  async createList(boardId: string, createListDto: CreateListDto) {
    await this.getBoard(boardId);

    const lastList = await this.prisma.boardList.findFirst({
      where: { boardId },
      orderBy: { position: "desc" }
    });

    return this.prisma.boardList.create({
      data: {
        title: createListDto.title.trim(),
        position: (lastList?.position ?? -1) + 1,
        boardId
      }
    });
  }

  async updateList(boardId: string, listId: string, updateListDto: UpdateListDto) {
    const list = await this.prisma.boardList.findFirst({
      where: {
        id: listId,
        boardId
      }
    });

    if (!list) {
      throw new NotFoundException("List not found");
    }

    return this.prisma.boardList.update({
      where: { id: listId },
      data: {
        title: updateListDto.title.trim()
      }
    });
  }

  async createCard(boardId: string, createCardDto: CreateCardDto) {
    const list = await this.prisma.boardList.findFirst({
      where: {
        id: createCardDto.listId,
        boardId
      }
    });

    if (!list) {
      throw new NotFoundException("List not found");
    }

    const lastCard = await this.prisma.card.findFirst({
      where: { listId: list.id },
      orderBy: { position: "desc" }
    });
    const assignee = await this.resolveAssignee(createCardDto.assignee);

    return this.prisma.card.create({
      data: {
        title: createCardDto.title.trim(),
        description: createCardDto.description?.trim() ?? "",
        position: (lastCard?.position ?? -1) + 1,
        listId: list.id,
        assigneeId: assignee?.id
      }
    });
  }

  async updateCard(boardId: string, cardId: string, updateCardDto: UpdateCardDto) {
    const card = await this.prisma.card.findFirst({
      where: {
        id: cardId,
        list: {
          boardId
        }
      }
    });

    if (!card) {
      throw new NotFoundException("Card not found");
    }

    const data: Prisma.CardUpdateInput = {};

    if (updateCardDto.title !== undefined) {
      data.title = updateCardDto.title.trim();
    }

    if (updateCardDto.description !== undefined) {
      data.description = updateCardDto.description.trim();
    }

    if (updateCardDto.assignee !== undefined) {
      const assignee = await this.resolveAssignee(updateCardDto.assignee);
      data.assignee = assignee
        ? { connect: { id: assignee.id } }
        : { disconnect: true };
    }

    return this.prisma.card.update({
      where: { id: cardId },
      data
    });
  }

  async moveCard(boardId: string, cardId: string, move: MoveCardDto) {
    return this.prisma.$transaction(async (tx) => {
      const board = await tx.board.findUnique({
        where: { id: boardId },
        include: {
          lists: {
            orderBy: { position: "asc" },
            include: {
              cards: {
                orderBy: { position: "asc" }
              }
            }
          }
        }
      });

      if (!board) {
        throw new NotFoundException("Board not found");
      }

      const fromList = board.lists.find((list) => list.id === move.fromListId);
      const toList = board.lists.find((list) => list.id === move.toListId);

      if (!fromList || !toList) {
        throw new NotFoundException("List not found");
      }

      const currentIndex = fromList.cards.findIndex((card) => card.id === cardId);

      if (currentIndex === -1) {
        throw new NotFoundException("Card not found");
      }

      const sourceCards = [...fromList.cards];
      const [card] = sourceCards.splice(currentIndex, 1);
      const destinationCards =
        fromList.id === toList.id ? sourceCards : [...toList.cards];
      const targetIndex = Math.min(Math.max(move.position, 0), destinationCards.length);

      destinationCards.splice(targetIndex, 0, card);

      const listStates = new Map<string, typeof sourceCards>();

      if (fromList.id === toList.id) {
        listStates.set(fromList.id, destinationCards);
      } else {
        listStates.set(fromList.id, sourceCards);
        listStates.set(toList.id, destinationCards);
      }

      const temporaryUpdates: Array<Promise<unknown>> = [];

      for (const cards of listStates.values()) {
        for (const item of cards) {
          temporaryUpdates.push(
            tx.card.update({
              where: { id: item.id },
              data: {
                position: item.position + 1000
              }
            })
          );
        }
      }

      await Promise.all(temporaryUpdates);

      const finalUpdates: Array<Promise<unknown>> = [];

      for (const [listId, cards] of listStates.entries()) {
        cards.forEach((item, index) => {
          finalUpdates.push(
            tx.card.update({
              where: { id: item.id },
              data: {
                listId,
                position: index
              }
            })
          );
        });
      }

      await Promise.all(finalUpdates);

      return {
        boardId,
        cardId,
        fromListId: move.fromListId,
        toListId: move.toListId,
        position: targetIndex
      };
    });
  }

  private async ensureDemoBoard() {
    const existingBoard = await this.prisma.board.findUnique({
      where: { id: DEMO_BOARD_ID },
      select: { id: true }
    });

    if (existingBoard) {
      return;
    }

    const ana = await this.upsertDemoUser("ana@kanban.local", "Ana");
    const bruno = await this.upsertDemoUser("bruno@kanban.local", "Bruno");
    const core = await this.upsertDemoUser("core@kanban.local", "Time Core");

    await this.prisma.board.create({
      data: {
        id: DEMO_BOARD_ID,
        title: "Launch workspace",
        memberships: {
          create: [
            { role: "OWNER", userId: ana.id },
            { role: "ADMIN", userId: bruno.id },
            { role: "MEMBER", userId: core.id }
          ]
        },
        lists: {
          create: [
            {
              id: "backlog",
              title: "Backlog",
              position: 0,
              cards: {
                create: [
                  {
                    id: "c1",
                    title: "Arquitetar perfis de acesso",
                    description: "Modelar owner, admin, member e guest.",
                    position: 0,
                    assigneeId: ana.id
                  }
                ]
              }
            },
            {
              id: "doing",
              title: "Doing",
              position: 1,
              cards: {
                create: [
                  {
                    id: "c2",
                    title: "Sincronizar board em tempo real",
                    description: "Propagar reorder e move via WebSocket.",
                    position: 0,
                    assigneeId: bruno.id
                  }
                ]
              }
            },
            {
              id: "done",
              title: "Done",
              position: 2,
              cards: {
                create: [
                  {
                    id: "c3",
                    title: "Subir stack local",
                    description: "Postgres e Redis prontos para desenvolvimento.",
                    position: 0,
                    assigneeId: core.id
                  }
                ]
              }
            }
          ]
        }
      }
    });
  }

  private async upsertDemoUser(email: string, displayName: string) {
    return this.prisma.user.upsert({
      where: { email },
      update: { displayName },
      create: { email, displayName }
    });
  }

  private async resolveAssignee(displayName?: string) {
    const value = displayName?.trim();

    if (!value) {
      return null;
    }

    const email = `${value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/(^\.|\.$)/g, "")}@kanban.local`;

    return this.prisma.user.upsert({
      where: { email },
      update: { displayName: value },
      create: {
        email,
        displayName: value
      }
    });
  }

  private mapBoard(board: {
    id: string;
    title: string;
    lists: Array<{
      id: string;
      title: string;
      position: number;
      cards: Array<{
        id: string;
        title: string;
        description: string | null;
        position: number;
        assignee: { displayName: string } | null;
      }>;
    }>;
  }): BoardView {
    return {
      id: board.id,
      title: board.title,
      lists: board.lists.map((list) => ({
        id: list.id,
        title: list.title,
        position: list.position,
        cards: list.cards.map((card) => ({
          id: card.id,
          title: card.title,
          description: card.description ?? "",
          assignee: card.assignee?.displayName ?? "Sem responsavel",
          position: card.position
        }))
      }))
    };
  }
}
