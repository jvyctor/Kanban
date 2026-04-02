import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { BoardRole, CardPriority, Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.interface";
import { SessionService } from "../auth/session.service";
import { MailService } from "../mail/mail.service";
import { SecurityAuditService } from "../security/security-audit.service";
import { BoardPresenceService } from "./board-presence.service";
import { getAppUrl } from "../config/runtime-config";
import { AcceptBoardInvitationDto } from "./dto/accept-board-invitation.dto";
import { CreateCardDto } from "./dto/create-card.dto";
import { CreateCardCommentDto } from "./dto/create-card-comment.dto";
import { CreateBoardInvitationDto } from "./dto/create-board-invitation.dto";
import { CreateListDto } from "./dto/create-list.dto";
import type { MoveCardDto } from "./dto/move-card.dto";
import { UpdateMemberPermissionsDto } from "./dto/update-member-permissions.dto";
import { UpdateCardDto } from "./dto/update-card.dto";
import { UpdateListDto } from "./dto/update-list.dto";

type BoardCardView = {
  id: string;
  title: string;
  description: string;
  priority: CardPriority;
  tags: string[];
  dueDate: string | null;
  createdAt: string;
  assignee: {
    id: string;
    displayName: string;
  } | null;
  position: number;
  comments: BoardCardCommentView[];
};

type BoardCardCommentView = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
  };
};

type BoardMemberView = {
  id: string;
  displayName: string;
  role: BoardRole;
  isOnline: boolean;
  permissions: MembershipPermissionsView;
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
  role: BoardRole;
  permissions: MembershipPermissionsView;
  members: BoardMemberView[];
  invitations: BoardInvitationView[];
  lists: BoardListView[];
};

type MembershipPermissionsView = {
  canManageMembers: boolean;
  canInviteMembers: boolean;
  canCreateLists: boolean;
  canEditLists: boolean;
  canCreateCards: boolean;
  canEditCards: boolean;
  canMoveCards: boolean;
  canComment: boolean;
};

type DashboardBoardView = {
  id: string;
  title: string;
  role: BoardRole;
  memberCount: number;
  totalCards: number;
  pendingCards: number;
  assignedToMe: number;
  highPriorityCards: number;
};

type DashboardTaskView = {
  id: string;
  title: string;
  priority: CardPriority;
  dueDate: string | null;
  boardId: string;
  boardTitle: string;
  listId: string;
  listTitle: string;
};

type DashboardInvitationView = {
  id: string;
  boardId: string;
  boardTitle: string;
  role: BoardRole;
  invitedByName: string;
  expiresAt: string;
};

type BoardInvitationView = {
  id: string;
  invitedEmail: string;
  role: BoardRole;
  createdAt: Date;
  expiresAt: Date;
  invitedBy: {
    id: string;
    displayName: string;
  };
};

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly presenceService: BoardPresenceService,
    private readonly securityAuditService: SecurityAuditService
  ) {}

  async listBoards(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        board: {
          select: {
            id: true,
            title: true,
            updatedAt: true
          }
        }
      }
    });

    return memberships.map((membership) => ({
      id: membership.board.id,
      title: membership.board.title,
      role: membership.role,
      updatedAt: membership.board.updatedAt
    }));
  }

  async getDashboard(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        board: {
          include: {
            memberships: {
              select: { userId: true }
            },
            lists: {
              include: {
                cards: {
                  select: {
                    id: true,
                    priority: true,
                    assigneeId: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const assignedCards = await this.prisma.card.findMany({
      where: {
        assigneeId: userId,
        list: {
          board: {
            memberships: {
              some: {
                userId
              }
            }
          }
        }
      },
      include: {
        list: {
          include: {
            board: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: [
        { dueDate: "asc" },
        { createdAt: "desc" }
      ]
    });

    const invitations = await this.prisma.boardInvitation.findMany({
      where: {
        invitedUserId: userId,
        acceptedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        board: {
          select: {
            id: true,
            title: true
          }
        },
        invitedBy: {
          select: {
            displayName: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return {
      boards: memberships.map((membership) => {
        const lists = membership.board.lists;
        const cards = lists.flatMap((list) => list.cards);
        const pendingCards = lists
          .filter((list) => !this.isCompletedListTitle(list.title))
          .flatMap((list) => list.cards);

        return {
          id: membership.board.id,
          title: membership.board.title,
          role: membership.role,
          memberCount: membership.board.memberships.length,
          totalCards: cards.length,
          pendingCards: pendingCards.length,
          assignedToMe: pendingCards.filter((card) => card.assigneeId === userId).length,
          highPriorityCards: pendingCards.filter((card) => card.priority === "HIGH").length
        } satisfies DashboardBoardView;
      }),
      assignedTasks: assignedCards
        .filter((card) => !this.isCompletedListTitle(card.list.title))
        .map((card) => ({
          id: card.id,
          title: card.title,
          priority: card.priority,
          dueDate: card.dueDate ? card.dueDate.toISOString() : null,
          boardId: card.list.board.id,
          boardTitle: card.list.board.title,
          listId: card.list.id,
          listTitle: card.list.title
        } satisfies DashboardTaskView)),
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        boardId: invitation.board.id,
        boardTitle: invitation.board.title,
        role: invitation.role,
        invitedByName: invitation.invitedBy.displayName,
        expiresAt: invitation.expiresAt.toISOString()
      } satisfies DashboardInvitationView))
    };
  }

  async getBoard(userId: string, boardId: string) {
    const membership = await this.ensureBoardAccess(userId, boardId);

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        },
        invitations: {
          where: {
            acceptedAt: null,
            expiresAt: {
              gt: new Date()
            }
          },
          include: {
            invitedBy: {
              select: {
                id: true,
                displayName: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        lists: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
              include: {
                assignee: {
                  select: {
                    id: true,
                    displayName: true
                  }
                },
                comments: {
                  orderBy: {
                    createdAt: "asc"
                  },
                  include: {
                    user: {
                      select: {
                        id: true,
                        displayName: true
                      }
                    }
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

    return this.mapBoard(board, userId, membership.role);
  }

  async createList(userId: string, boardId: string, createListDto: CreateListDto) {
    await this.ensureBoardPermission(userId, boardId, "canCreateLists");

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

  async updateList(
    userId: string,
    boardId: string,
    listId: string,
    updateListDto: UpdateListDto
  ) {
    await this.ensureBoardPermission(userId, boardId, "canEditLists");

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

  async createCard(userId: string, boardId: string, createCardDto: CreateCardDto) {
    await this.ensureBoardPermission(userId, boardId, "canCreateCards");

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
    const assignee = await this.resolveAssignee(boardId, createCardDto.assigneeId);

    return this.prisma.card.create({
      data: {
        title: createCardDto.title.trim(),
        description: createCardDto.description?.trim() ?? "",
        priority: createCardDto.priority ?? "MEDIUM",
        tags: createCardDto.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
        position: (lastCard?.position ?? -1) + 1,
        dueDate: createCardDto.dueDate ?? null,
        listId: list.id,
        assigneeId: assignee?.id
      }
    });
  }

  async updateCard(
    userId: string,
    boardId: string,
    cardId: string,
    updateCardDto: UpdateCardDto
  ) {
    await this.ensureBoardPermission(userId, boardId, "canEditCards");

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

    if (updateCardDto.priority !== undefined) {
      data.priority = updateCardDto.priority;
    }

    if (updateCardDto.tags !== undefined) {
      data.tags = updateCardDto.tags.map((tag) => tag.trim()).filter(Boolean);
    }

    if (updateCardDto.dueDate !== undefined) {
      data.dueDate = updateCardDto.dueDate;
    }

    if (updateCardDto.assigneeId !== undefined) {
      const assignee = await this.resolveAssignee(boardId, updateCardDto.assigneeId);
      data.assignee = assignee
        ? { connect: { id: assignee.id } }
        : { disconnect: true };
    }

    return this.prisma.card.update({
      where: { id: cardId },
      data
    });
  }

  async addCommentToCard(
    currentUser: CurrentUser,
    boardId: string,
    cardId: string,
    createCommentDto: CreateCardCommentDto
  ) {
    await this.ensureBoardPermission(currentUser.id, boardId, "canComment");

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

    return this.prisma.cardComment.create({
      data: {
        cardId,
        userId: currentUser.id,
        content: createCommentDto.content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    });
  }

  async moveCard(userId: string, boardId: string, cardId: string, move: MoveCardDto) {
    await this.ensureBoardPermission(userId, boardId, "canMoveCards");

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

  async inviteUserToBoard(
    currentUser: CurrentUser,
    boardId: string,
    createInvitationDto: CreateBoardInvitationDto
  ) {
    const membership = await this.ensureBoardPermission(currentUser.id, boardId, "canInviteMembers");
    const invitedEmail = createInvitationDto.email.trim().toLowerCase();
    const invitedUser = await this.prisma.user.findUnique({
      where: { email: invitedEmail }
    });

    if (!invitedUser) {
      throw new NotFoundException("User with this email was not found");
    }

    if (invitedUser.id === currentUser.id) {
      throw new BadRequestException("You are already on this board");
    }

    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId: invitedUser.id
        }
      }
    });

    if (existingMembership) {
      throw new ConflictException("User is already a board member");
    }

    const existingInvitation = await this.prisma.boardInvitation.findFirst({
      where: {
        boardId,
        invitedUserId: invitedUser.id,
        acceptedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (existingInvitation) {
      throw new ConflictException("There is already a pending invitation for this user");
    }

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { title: true }
    });

    if (!board) {
      throw new NotFoundException("Board not found");
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
    const role = this.normalizeInvitationRole(membership.role, createInvitationDto.role);

    const invitation = await this.prisma.boardInvitation.create({
      data: {
        boardId,
        invitedById: currentUser.id,
        invitedUserId: invitedUser.id,
        invitedEmail,
        role,
        tokenHash: this.sessionService.hashToken(token),
        expiresAt
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            displayName: true,
          }
        }
      }
    });

    const appUrl = getAppUrl();
    const acceptUrl = `${appUrl}/?invite=${encodeURIComponent(token)}`;

    await this.mailService.sendBoardInvitation({
      to: invitedEmail,
      invitedByName: currentUser.displayName,
      boardTitle: board.title,
      acceptUrl
    });

    return {
      id: invitation.id,
      invitedEmail: invitation.invitedEmail,
      role: invitation.role,
      expiresAt: invitation.expiresAt
    };
  }

  async acceptInvitation(currentUser: CurrentUser, dto: AcceptBoardInvitationDto) {
    const invitation = await this.prisma.boardInvitation.findUnique({
      where: {
        tokenHash: this.sessionService.hashToken(dto.token)
      }
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException("Invitation already accepted");
    }

    if (invitation.expiresAt <= new Date()) {
      throw new BadRequestException("Invitation expired");
    }

    if (invitation.invitedUserId !== currentUser.id) {
      throw new ForbiddenException("This invitation belongs to another user");
    }

    if (invitation.invitedEmail !== currentUser.email) {
      throw new ForbiddenException("Invitation email does not match the authenticated user");
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        boardId_userId: {
          boardId: invitation.boardId,
          userId: currentUser.id
        }
      }
    });

    if (!membership) {
      await this.prisma.membership.create({
        data: {
          boardId: invitation.boardId,
          userId: currentUser.id,
          role: invitation.role
        }
      });
    }

    await this.prisma.boardInvitation.update({
      where: {
        id: invitation.id
      },
      data: {
        acceptedAt: new Date()
      }
    });

    this.securityAuditService.info("board.invitation.accepted", {
      boardId: invitation.boardId,
      userId: currentUser.id,
      invitationId: invitation.id
    });

    return this.getBoard(currentUser.id, invitation.boardId);
  }

  async updateMemberPermissions(
    currentUser: CurrentUser,
    boardId: string,
    memberId: string,
    dto: UpdateMemberPermissionsDto
  ) {
    const actorMembership = await this.ensureBoardPermission(
      currentUser.id,
      boardId,
      "canManageMembers"
    );

    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId: memberId
        }
      },
      include: {
        user: {
          select: {
            id: true
          }
        }
      }
    });

    if (!targetMembership) {
      throw new NotFoundException("Member not found");
    }

    if (targetMembership.role === "OWNER") {
      throw new ForbiddenException("Owner permissions cannot be changed");
    }

    if (actorMembership.role !== "OWNER" && targetMembership.role === "ADMIN") {
      throw new ForbiddenException("Only owners can change administrator permissions");
    }

    const nextRole = dto.role ?? targetMembership.role;

    if (nextRole === "OWNER") {
      throw new BadRequestException("Owner role cannot be assigned here");
    }

    if (actorMembership.role !== "OWNER" && nextRole === "ADMIN") {
      throw new ForbiddenException("Only owners can grant administrator permissions");
    }

    const defaults = this.getDefaultPermissionsForRole(nextRole);

    await this.prisma.membership.update({
      where: {
        boardId_userId: {
          boardId,
          userId: memberId
        }
      },
      data: {
        role: nextRole,
        canManageMembers: dto.canManageMembers ?? defaults.canManageMembers,
        canInviteMembers: dto.canInviteMembers ?? defaults.canInviteMembers,
        canCreateLists: dto.canCreateLists ?? defaults.canCreateLists,
        canEditLists: dto.canEditLists ?? defaults.canEditLists,
        canCreateCards: dto.canCreateCards ?? defaults.canCreateCards,
        canEditCards: dto.canEditCards ?? defaults.canEditCards,
        canMoveCards: dto.canMoveCards ?? defaults.canMoveCards,
        canComment: dto.canComment ?? defaults.canComment
      }
    });

    return this.getBoard(currentUser.id, boardId);
  }

  async ensureBoardAccess(
    userId: string,
    boardId: string,
    allowedRoles?: BoardRole[]
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId
        }
      }
    });

    if (!membership) {
      throw new ForbiddenException("Board access denied");
    }

    if (allowedRoles && !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException("Insufficient board role");
    }

    return membership;
  }

  async ensureBoardPermission(
    userId: string,
    boardId: string,
    permission: keyof MembershipPermissionsView
  ) {
    const membership = await this.ensureBoardAccess(userId, boardId);

    if (membership.role === "OWNER") {
      return membership;
    }

    if (!membership[permission]) {
      throw new ForbiddenException("Insufficient board permission");
    }

    return membership;
  }

  private async resolveAssignee(boardId: string, assigneeId?: string) {
    const value = assigneeId?.trim();

    if (!value) {
      return null;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId: value
        }
      },
      include: {
        user: true
      }
    });

    return membership?.user ?? null;
  }

  private normalizeInvitationRole(actorRole: BoardRole, requestedRole?: BoardRole) {
    const role = requestedRole ?? "MEMBER";

    if (role === "OWNER") {
      throw new BadRequestException("Invitations cannot grant owner role");
    }

    if (actorRole !== "OWNER" && role === "ADMIN") {
      throw new ForbiddenException("Only owners can invite admins");
    }

    return role;
  }

  private mapPermissions(membership: {
    canManageMembers: boolean;
    canInviteMembers: boolean;
    canCreateLists: boolean;
    canEditLists: boolean;
    canCreateCards: boolean;
    canEditCards: boolean;
    canMoveCards: boolean;
    canComment: boolean;
  }): MembershipPermissionsView {
    return {
      canManageMembers: membership.canManageMembers,
      canInviteMembers: membership.canInviteMembers,
      canCreateLists: membership.canCreateLists,
      canEditLists: membership.canEditLists,
      canCreateCards: membership.canCreateCards,
      canEditCards: membership.canEditCards,
      canMoveCards: membership.canMoveCards,
      canComment: membership.canComment
    };
  }

  private getDefaultPermissionsForRole(role: BoardRole): MembershipPermissionsView {
    if (role === "OWNER" || role === "ADMIN") {
      return {
        canManageMembers: true,
        canInviteMembers: true,
        canCreateLists: true,
        canEditLists: true,
        canCreateCards: true,
        canEditCards: true,
        canMoveCards: true,
        canComment: true
      };
    }

    if (role === "MEMBER") {
      return {
        canManageMembers: false,
        canInviteMembers: false,
        canCreateLists: true,
        canEditLists: true,
        canCreateCards: true,
        canEditCards: true,
        canMoveCards: true,
        canComment: true
      };
    }

    return {
      canManageMembers: false,
      canInviteMembers: false,
      canCreateLists: false,
      canEditLists: false,
      canCreateCards: false,
      canEditCards: false,
      canMoveCards: false,
      canComment: true
    };
  }

  private isCompletedListTitle(title: string) {
    const normalized = title.trim().toLowerCase();
    return ["done", "concluido", "concluído", "finalizado", "completed"].some((value) =>
      normalized.includes(value)
    );
  }

  private mapBoard(board: {
    id: string;
    title: string;
    memberships: Array<{
      role: BoardRole;
      canManageMembers: boolean;
      canInviteMembers: boolean;
      canCreateLists: boolean;
      canEditLists: boolean;
      canCreateCards: boolean;
      canEditCards: boolean;
      canMoveCards: boolean;
      canComment: boolean;
      user: {
        id: string;
        displayName: string;
      };
    }>;
    invitations: Array<{
      id: string;
      invitedEmail: string;
      role: BoardRole;
      createdAt: Date;
      expiresAt: Date;
      invitedBy: {
        id: string;
        displayName: string;
      };
    }>;
    lists: Array<{
      id: string;
      title: string;
      position: number;
      cards: Array<{
        id: string;
        title: string;
        description: string | null;
        priority: CardPriority;
        tags: string[];
        position: number;
        dueDate: Date | null;
        createdAt: Date;
        assignee: { id: string; displayName: string } | null;
        comments: Array<{
          id: string;
          content: string;
          createdAt: Date;
          user: {
            id: string;
            displayName: string;
          };
        }>;
      }>;
    }>;
  }, currentUserId: string, role: BoardRole): BoardView {
    const currentMembership = board.memberships.find((membership) => membership.user.id === currentUserId);

    return {
      id: board.id,
      title: board.title,
      role,
      permissions: currentMembership
        ? this.mapPermissions(currentMembership)
        : this.getDefaultPermissionsForRole(role),
      members: board.memberships.map((membership) => ({
        id: membership.user.id,
        displayName: membership.user.displayName,
        role: membership.role,
        isOnline: this.presenceService.isOnline(board.id, membership.user.id),
        permissions: this.mapPermissions(membership)
      })),
      invitations: board.invitations.map((invitation) => ({
        id: invitation.id,
        invitedEmail: invitation.invitedEmail,
        role: invitation.role,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy
      })),
      lists: board.lists.map((list) => ({
        id: list.id,
        title: list.title,
        position: list.position,
        cards: list.cards.map((card) => ({
          id: card.id,
          title: card.title,
          description: card.description ?? "",
          priority: card.priority,
          tags: card.tags,
          dueDate: card.dueDate ? card.dueDate.toISOString() : null,
          createdAt: card.createdAt.toISOString(),
          assignee: card.assignee
            ? {
                id: card.assignee.id,
                displayName: card.assignee.displayName
              }
            : null,
          position: card.position,
          comments: card.comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            author: {
              id: comment.user.id,
              displayName: comment.user.displayName
            }
          }))
        }))
      }))
    };
  }
}
