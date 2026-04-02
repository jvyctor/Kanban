"use client";

import type { LucideIcon } from "lucide-react";
import {
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users
} from "lucide-react";

export type BoardRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type CardPriority = "LOW" | "MEDIUM" | "HIGH";

export type SessionUser = { id: string; email: string; displayName: string };
export type BoardSummary = { id: string; title: string; role: BoardRole };
export type MembershipPermissions = {
  canManageMembers: boolean;
  canInviteMembers: boolean;
  canCreateLists: boolean;
  canEditLists: boolean;
  canCreateCards: boolean;
  canEditCards: boolean;
  canMoveCards: boolean;
  canComment: boolean;
};
export type BoardMember = { id: string; displayName: string; role: BoardRole };
export type BoardMemberWithState = BoardMember & {
  isOnline: boolean;
  permissions: MembershipPermissions;
};

export type BoardInvitation = {
  id: string;
  invitedEmail: string;
  role: BoardRole;
  invitedBy: { id: string; displayName: string };
};

export type CardComment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; displayName: string };
};

export type BoardCard = {
  id: string;
  title: string;
  description: string;
  priority: CardPriority;
  tags: string[];
  dueDate: string | null;
  createdAt: string;
  assignee: { id: string; displayName: string } | null;
  comments: CardComment[];
};

export type BoardList = { id: string; title: string; cards: BoardCard[] };

export type BoardData = {
  id: string;
  title: string;
  role: BoardRole;
  permissions: MembershipPermissions;
  members: BoardMemberWithState[];
  invitations: BoardInvitation[];
  lists: BoardList[];
};

export type DashboardBoard = {
  id: string;
  title: string;
  role: BoardRole;
  memberCount: number;
  totalCards: number;
  pendingCards: number;
  assignedToMe: number;
  highPriorityCards: number;
};

export type DashboardTask = {
  id: string;
  title: string;
  priority: CardPriority;
  dueDate: string | null;
  boardId: string;
  boardTitle: string;
  listId: string;
  listTitle: string;
};

export type DashboardInvitation = {
  id: string;
  boardId: string;
  boardTitle: string;
  role: BoardRole;
  invitedByName: string;
  expiresAt: string;
};

export type TaskDraft = { title: string };

export type DragState = { cardId: string; fromListId: string } | null;

export type CardEditorState = {
  title: string;
  description: string;
  priority: CardPriority;
  tagsText: string;
  dueDate: string;
  assigneeId: string;
};

export const sidebarMenu: Array<{ icon: LucideIcon; label: string; active?: boolean }> = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: FolderKanban, label: "Quadros", active: true },
  { icon: Users, label: "Equipe" },
  { icon: Settings, label: "Configuracoes" }
];

export const priorityMeta: Record<
  CardPriority,
  { label: string; badgeClassName: string }
> = {
  LOW: {
    label: "Baixa",
    badgeClassName: "border-[color:var(--tone-info-border)] bg-[color:var(--tone-info-bg)] text-[color:var(--tone-info-text)]"
  },
  MEDIUM: {
    label: "Media",
    badgeClassName: "border-[color:var(--tone-warning-border)] bg-[color:var(--tone-warning-bg)] text-[color:var(--tone-warning-text)]"
  },
  HIGH: {
    label: "Alta",
    badgeClassName: "border-[color:var(--tone-danger-border)] bg-[color:var(--tone-danger-bg)] text-[color:var(--tone-danger-text)]"
  }
};

export const columnPalette = ["#6366f1", "#f59e0b", "#8b5cf6", "#22c55e", "#ec4899", "#3b82f6"];

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    try {
      const parsed = JSON.parse(error.message) as {
        message?: string | string[];
        retryAfterSeconds?: number;
        statusCode?: number;
      };

      if (parsed.statusCode === 429 || parsed.message === "Too many requests") {
        const retryAfter = Number(parsed.retryAfterSeconds ?? 0);

        if (retryAfter > 0) {
          return `Muitas tentativas. Aguarde ${retryAfter} segundo(s) e tente novamente.`;
        }

        return "Muitas tentativas. Aguarde um pouco e tente novamente.";
      }

      if (Array.isArray(parsed.message) && parsed.message.length > 0) {
        return parsed.message[0];
      }

      const safeMessages = new Set([
        "Authentication required",
        "Invalid credentials",
        "Board access denied",
        "Insufficient board role",
        "Insufficient board permission",
        "Invitation not found",
        "Invitation expired",
        "Invitation already accepted",
        "Reset token is invalid or expired",
        "Email already in use",
        "Member not found",
        "List not found",
        "Card not found",
        "Board not found",
        "There is already a pending invitation for this user",
        "User is already a board member",
        "Only owners can invite admins",
        "You are already on this board"
      ]);

      if (
        typeof parsed.message === "string" &&
        parsed.message.trim() &&
        safeMessages.has(parsed.message)
      ) {
        return parsed.message;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function getRoleLabel(role: BoardRole) {
  if (role === "OWNER") return "Responsavel";
  if (role === "ADMIN") return "Administrador";
  if (role === "MEMBER") return "Colaborador";
  return "Visualizador";
}

export function formatDueDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  }).format(date);
}

export function formatDateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function parseTags(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildCardEditor(card: BoardCard): CardEditorState {
  return {
    title: card.title,
    description: card.description,
    priority: card.priority,
    tagsText: card.tags.join(", "),
    dueDate: formatDateInputValue(card.dueDate),
    assigneeId: card.assignee?.id ?? ""
  };
}

export function getAdjustedPosition(
  board: BoardData,
  cardId: string,
  fromListId: string,
  toListId: string,
  position: number
) {
  if (fromListId !== toListId) return position;
  const list = board.lists.find((item) => item.id === fromListId);
  if (!list) return position;
  const currentIndex = list.cards.findIndex((card) => card.id === cardId);
  if (currentIndex === -1) return position;
  return position > currentIndex ? position - 1 : position;
}

export function moveCardLocally(
  board: BoardData,
  cardId: string,
  fromListId: string,
  toListId: string,
  position: number
) {
  const lists = board.lists.map((list) => ({ ...list, cards: [...list.cards] }));
  const fromList = lists.find((list) => list.id === fromListId);
  const toList = lists.find((list) => list.id === toListId);

  if (!fromList || !toList) return board;

  const currentIndex = fromList.cards.findIndex((card) => card.id === cardId);
  if (currentIndex === -1) return board;

  const [card] = fromList.cards.splice(currentIndex, 1);
  const targetIndex = Math.min(Math.max(position, 0), toList.cards.length);
  toList.cards.splice(targetIndex, 0, card);

  return { ...board, lists };
}
