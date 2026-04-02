"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { io } from "socket.io-client";
import { AuthScreen } from "../components/kanban/auth-screen";
import { CardDialog } from "../components/kanban/card-dialog";
import { InviteDrawer } from "../components/kanban/invite-drawer";
import { KanbanCard } from "../components/kanban/kanban-card";
import { KanbanColumn } from "../components/kanban/kanban-column";
import { KanbanHeader } from "../components/kanban/kanban-header";
import { KanbanSidebar } from "../components/kanban/kanban-sidebar";
import {
  buildCardEditor,
  columnPalette,
  formatDueDate,
  getAdjustedPosition,
  getErrorMessage,
  moveCardLocally,
  parseTags,
  priorityMeta,
  type BoardCard,
  type BoardData,
  type DashboardBoard,
  type DashboardInvitation,
  type DashboardTask,
  type BoardRole,
  type BoardSummary,
  type CardEditorState,
  type DragState,
  type SessionUser,
  type TaskDraft
} from "../lib/kanban-types";

type Props = {
  apiUrl: string;
  initialInviteToken?: string;
  initialResetToken?: string;
};

export function BoardClient({ apiUrl, initialInviteToken, initialResetToken }: Props) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(true);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [inviteToken, setInviteToken] = useState(initialInviteToken ?? "");
  const [resetToken, setResetToken] = useState(initialResetToken ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSection, setCurrentSection] = useState<"dashboard" | "boards" | "team" | "settings">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [workspaceTheme, setWorkspaceTheme] = useState<"light" | "dark">("dark");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeCardEditor, setActiveCardEditor] = useState<CardEditorState | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [dragState, setDragState] = useState<DragState>(null);
  const [activeOverlayCard, setActiveOverlayCard] = useState<BoardCard | null>(null);
  const [listDrafts, setListDrafts] = useState<Record<string, TaskDraft>>({});
  const [newListTitle, setNewListTitle] = useState("");
  const [showWelcomeTransition, setShowWelcomeTransition] = useState(false);
  const [dashboard, setDashboard] = useState<{
    boards: DashboardBoard[];
    assignedTasks: DashboardTask[];
    invitations: DashboardInvitation[];
  }>({
    boards: [],
    assignedTasks: [],
    invitations: []
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: "",
    confirmPassword: ""
  });
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "MEMBER" as BoardRole
  });
  const [filters, setFilters] = useState<{
    priorities: Array<"LOW" | "MEDIUM" | "HIGH">;
    unassignedOnly: boolean;
    assignedToMe: boolean;
    dueSoon: boolean;
  }>({
    priorities: [],
    unassignedOnly: false,
    assignedToMe: false,
    dueSoon: false
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    })
  );

  const canWrite = board
    ? board.permissions.canCreateLists ||
      board.permissions.canCreateCards ||
      board.permissions.canEditCards ||
      board.permissions.canMoveCards
    : false;
  const canInvite = board ? board.permissions.canInviteMembers : false;
  const canManageMembers = board ? board.permissions.canManageMembers : false;

  const workspaceThemeVars = useMemo(
    () =>
      workspaceTheme === "dark"
        ? ({
            "--ui-bg": "#0c1424",
            "--ui-sidebar-bg": "#111b2f",
            "--ui-header-bg": "rgba(12,20,36,0.82)",
            "--ui-panel": "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))",
            "--ui-surface": "rgba(255,255,255,0.05)",
            "--ui-surface-hover": "rgba(255,255,255,0.075)",
            "--ui-text": "#eff6ff",
            "--ui-muted": "#8ea3c2",
            "--ui-border": "rgba(255,255,255,0.09)",
            "--ui-border-subtle": "rgba(255,255,255,0.06)",
            "--ui-chip-bg": "rgba(255,255,255,0.06)",
            "--ui-shadow": "rgba(0,0,0,0.18)",
            "--ui-accent": "#78bfff",
            "--ui-accent-foreground": "#07111f",
            "--ui-accent-shadow": "rgba(120,191,255,0.28)",
            "--ui-accent-ring": "rgba(120,191,255,0.14)",
            "--ui-accent-soft-bg": "rgba(120,191,255,0.14)",
            "--ui-accent-soft-border": "rgba(120,191,255,0.24)",
            "--ui-accent-text": "#9fd2ff",
            "--ui-accent-text-strong": "#78bfff",
            "--ui-accent-pulse": "rgba(120,191,255,0.4)",
            "--tone-info-border": "rgba(96,165,250,0.22)",
            "--tone-info-bg": "rgba(96,165,250,0.12)",
            "--tone-info-text": "#93c5fd",
            "--tone-warning-border": "rgba(251,191,36,0.22)",
            "--tone-warning-bg": "rgba(251,191,36,0.12)",
            "--tone-warning-text": "#fcd34d",
            "--tone-danger-border": "rgba(251,113,133,0.22)",
            "--tone-danger-bg": "rgba(251,113,133,0.12)",
            "--tone-danger-text": "#fda4af"
          } as CSSProperties)
        : ({
            "--ui-bg": "#f3f8ff",
            "--ui-sidebar-bg": "#ffffff",
            "--ui-header-bg": "rgba(243,248,255,0.82)",
            "--ui-panel": "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(247,250,255,0.88))",
            "--ui-surface": "rgba(255,255,255,0.92)",
            "--ui-surface-hover": "rgba(236,244,255,0.96)",
            "--ui-text": "#10213e",
            "--ui-muted": "#6780a6",
            "--ui-border": "rgba(115,149,201,0.18)",
            "--ui-border-subtle": "rgba(115,149,201,0.14)",
            "--ui-chip-bg": "rgba(103,128,166,0.10)",
            "--ui-shadow": "rgba(70,109,176,0.12)",
            "--ui-accent": "#5baeff",
            "--ui-accent-foreground": "#ffffff",
            "--ui-accent-shadow": "rgba(91,174,255,0.24)",
            "--ui-accent-ring": "rgba(91,174,255,0.14)",
            "--ui-accent-soft-bg": "rgba(91,174,255,0.12)",
            "--ui-accent-soft-border": "rgba(91,174,255,0.22)",
            "--ui-accent-text": "#267bd3",
            "--ui-accent-text-strong": "#1d6ec1",
            "--ui-accent-pulse": "rgba(91,174,255,0.3)",
            "--tone-info-border": "rgba(59,130,246,0.18)",
            "--tone-info-bg": "rgba(59,130,246,0.10)",
            "--tone-info-text": "#2563eb",
            "--tone-warning-border": "rgba(245,158,11,0.18)",
            "--tone-warning-bg": "rgba(245,158,11,0.10)",
            "--tone-warning-text": "#c27803",
            "--tone-danger-border": "rgba(244,63,94,0.18)",
            "--tone-danger-bg": "rgba(244,63,94,0.10)",
            "--tone-danger-text": "#e11d48"
          } as CSSProperties),
    [workspaceTheme]
  );

  const activeCard = useMemo(() => {
    if (!board || !activeCardId) return null;
    for (const list of board.lists) {
      const card = list.cards.find((item) => item.id === activeCardId);
      if (card) {
        return { ...card, listId: list.id, listTitle: list.title };
      }
    }
    return null;
  }, [activeCardId, board]);

  const filteredLists = useMemo(() => {
    if (!board) return [];

    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const soonLimit = new Date();
    soonLimit.setDate(now.getDate() + 3);

    return board.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => {
        const matchesQuery =
          !query ||
          [
            card.title,
            card.description,
            card.assignee?.displayName ?? "",
            ...card.tags,
            ...card.comments.map((comment) => comment.content)
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

        const matchesPriority =
          filters.priorities.length === 0 || filters.priorities.includes(card.priority);
        const matchesUnassigned = !filters.unassignedOnly || !card.assignee;
        const matchesAssignedToMe = !filters.assignedToMe || card.assignee?.id === user?.id;
        const dueDate = card.dueDate ? new Date(card.dueDate) : null;
        const matchesDueSoon =
          !filters.dueSoon ||
          (!!dueDate && !Number.isNaN(dueDate.getTime()) && dueDate <= soonLimit && dueDate >= now);

        return (
          matchesQuery &&
          matchesPriority &&
          matchesUnassigned &&
          matchesAssignedToMe &&
          matchesDueSoon
        );
      })
    }));
  }, [board, filters, searchQuery, user?.id]);

  const notifications = useMemo(() => {
    if (!board) return [];

    const cards = board.lists.flatMap((list) => list.cards);
    const now = new Date();
    const soonLimit = new Date();
    soonLimit.setDate(now.getDate() + 3);

    const highPriority = cards.filter((card) => card.priority === "HIGH").length;
    const unassigned = cards.filter((card) => !card.assignee).length;
    const dueSoon = cards.filter((card) => {
      if (!card.dueDate) return false;
      const date = new Date(card.dueDate);
      return !Number.isNaN(date.getTime()) && date >= now && date <= soonLimit;
    }).length;

    return [
      board.invitations.length > 0
        ? {
            id: "pending-invites",
            title: `${board.invitations.length} convite(s) pendente(s)`,
            description: "Existem convites aguardando aceite para este quadro."
          }
        : null,
      highPriority > 0
        ? {
            id: "high-priority",
            title: `${highPriority} tarefa(s) com prioridade alta`,
            description: "Itens mais sensiveis do quadro precisam de atencao."
          }
        : null,
      dueSoon > 0
        ? {
            id: "due-soon",
            title: `${dueSoon} prazo(s) proximos`,
            description: "Tarefas com vencimento nos proximos 3 dias."
          }
        : null,
      unassigned > 0
        ? {
            id: "unassigned",
            title: `${unassigned} tarefa(s) sem responsavel`,
            description: "Itens sem dono definido podem travar o fluxo."
          }
        : null
    ].filter(Boolean) as Array<{ id: string; title: string; description: string }>;
  }, [board]);

  const hasActiveFilters =
    filters.priorities.length > 0 ||
    filters.unassignedOnly ||
    filters.assignedToMe ||
    filters.dueSoon;

  const selectedMember =
    board?.members.find((member) => member.id === selectedMemberId) ?? board?.members[0] ?? null;

  async function request<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) throw new Error(await response.text());
    if (response.status === 204) return null as T;
    return (await response.json()) as T;
  }

  async function loadBoard(boardId: string) {
    const data = await request<BoardData>(`/boards/${boardId}`);
    setBoard(data);

    if (!activeCardId) return;

    const nextCard = data.lists.flatMap((list) => list.cards).find((card) => card.id === activeCardId);
    if (!nextCard) {
      setActiveCardId(null);
      setActiveCardEditor(null);
      return;
    }

    setActiveCardEditor(buildCardEditor(nextCard));
  }

  async function loadDashboard() {
    const data = await request<{
      boards: DashboardBoard[];
      assignedTasks: DashboardTask[];
      invitations: DashboardInvitation[];
    }>("/boards/dashboard");
    setDashboard(data);
  }

  async function loadBoards(preferredBoardId?: string | null) {
    const data = await request<{ boards: BoardSummary[] }>("/boards");
    setBoards(data.boards);

    const nextBoardId =
      preferredBoardId && data.boards.some((item) => item.id === preferredBoardId)
        ? preferredBoardId
        : data.boards[0]?.id ?? null;

    setActiveBoardId(nextBoardId);

    if (nextBoardId) {
      await loadBoard(nextBoardId);
    } else {
      setBoard(null);
    }
  }

  async function bootstrap() {
    setLoading(true);
    try {
      const data = await request<{ user: SessionUser }>("/auth/me");
      setUser(data.user);
      await loadDashboard();
      await loadBoards(activeBoardId);
    } catch {
      setUser(null);
      setBoards([]);
      setBoard(null);
      setDashboard({ boards: [], assignedTasks: [], invitations: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!user || !activeBoardId) return;

    const socket = io(apiUrl, { withCredentials: true });
    socket.on("connect", () => {
      socket.emit("board:join", { boardId: activeBoardId });
    });
    socket.on("board:updated", (event: { board: BoardData }) => {
      if (event.board.id === activeBoardId) {
        setBoard(event.board);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeBoardId, apiUrl, user]);

  useEffect(() => {
    if (!user || !inviteToken || saving === "accept-invite") return;
    void acceptInvitation(inviteToken);
  }, [inviteToken, saving, user]);

  useEffect(() => {
    if (!initialResetToken) return;
    setResetToken(initialResetToken);
    setForgotPasswordOpen(false);
    setMode("login");
  }, [initialResetToken]);

  useEffect(() => {
    if (!board?.members.length) {
      setSelectedMemberId(null);
      return;
    }

    if (!selectedMemberId || !board.members.some((member) => member.id === selectedMemberId)) {
      setSelectedMemberId(board.members[0].id);
    }
  }, [board, selectedMemberId]);

  async function authenticate(path: "/auth/login" | "/auth/register", body: object) {
    setSaving(path);
    setError(null);
    setMessage(null);

    try {
      const data = await request<{ user: SessionUser }>(path, {
        method: "POST",
        body: JSON.stringify(body)
      });

      setUser(data.user);
      setShowWelcomeTransition(true);
      await loadDashboard();
      await loadBoards();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Nao foi possivel entrar com esses dados."));
    } finally {
      setSaving(null);
    }
  }

  async function handleRegister() {
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("As senhas informadas nao coincidem.");
      return;
    }

    await authenticate("/auth/register", {
      displayName: registerForm.displayName,
      email: registerForm.email,
      password: registerForm.password
    });
  }

  async function requestPasswordReset() {
    if (!forgotPasswordEmail.trim()) {
      setError("Informe o email da sua conta.");
      return;
    }

    setSaving("request-password-reset");
    setError(null);
    setMessage(null);

    try {
      await request("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: forgotPasswordEmail.trim() })
      });
      setForgotPasswordOpen(false);
      setForgotPasswordEmail("");
      setMessage("Se esse email existir na plataforma, enviamos o link de recuperacao.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Nao foi possivel iniciar a recuperacao de senha."));
    } finally {
      setSaving(null);
    }
  }

  async function confirmPasswordReset() {
    if (!resetToken) {
      setError("O link de recuperacao nao foi encontrado.");
      return;
    }

    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      setError("As senhas informadas nao coincidem.");
      return;
    }

    setSaving("confirm-password-reset");
    setError(null);
    setMessage(null);

    try {
      await request("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({
          token: resetToken,
          password: resetPasswordForm.password
        })
      });

      setResetPasswordForm({ password: "", confirmPassword: "" });
      setResetToken("");
      setMessage("Senha redefinida com sucesso. Agora voce pode entrar.");

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("reset");
        window.history.replaceState({}, "", url.toString());
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Nao foi possivel redefinir a senha."));
    } finally {
      setSaving(null);
    }
  }

  async function logout() {
    await request("/auth/logout", { method: "POST" });
    setUser(null);
    setBoards([]);
    setBoard(null);
    setDashboard({ boards: [], assignedTasks: [], invitations: [] });
    setActiveBoardId(null);
    setActiveCardId(null);
    setActiveCardEditor(null);
    setShowWelcomeTransition(false);
  }

  async function createList() {
    if (!board || !newListTitle.trim()) return;

    setSaving("create-list");
    setError(null);

    try {
      await request(`/boards/${board.id}/lists`, {
        method: "POST",
        body: JSON.stringify({ title: newListTitle.trim() })
      });
      setNewListTitle("");
      await loadDashboard();
      await loadBoard(board.id);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Nao foi possivel adicionar a etapa."));
    } finally {
      setSaving(null);
    }
  }

  async function createCard(listId: string) {
    if (!board) return;

    const title = listDrafts[listId]?.title?.trim();
    if (!title) return;

    setSaving(`create-card:${listId}`);
    setError(null);

    try {
      await request(`/boards/${board.id}/cards`, {
        method: "POST",
        body: JSON.stringify({ listId, title, priority: "MEDIUM", tags: [] })
      });

      setListDrafts((current) => ({ ...current, [listId]: { title: "" } }));
      await loadDashboard();
      await loadBoard(board.id);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Nao foi possivel criar a tarefa."));
    } finally {
      setSaving(null);
    }
  }

  async function updateCardDetails() {
    if (!board || !activeCardId || !activeCardEditor) return;

    setSaving(`update-card:${activeCardId}`);
    setError(null);

    try {
      await request(`/boards/${board.id}/cards/${activeCardId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: activeCardEditor.title.trim(),
          description: activeCardEditor.description.trim(),
          priority: activeCardEditor.priority,
          tags: parseTags(activeCardEditor.tagsText),
          dueDate: activeCardEditor.dueDate ? new Date(activeCardEditor.dueDate).toISOString() : null,
          assigneeId: activeCardEditor.assigneeId || undefined
        })
      });

      await loadDashboard();
      await loadBoard(board.id);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Nao foi possivel salvar o card."));
    } finally {
      setSaving(null);
    }
  }

  async function addComment() {
    if (!board || !activeCardId || !commentDraft.trim()) return;

    setSaving(`comment:${activeCardId}`);
    setError(null);

    try {
      await request(`/boards/${board.id}/cards/${activeCardId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentDraft.trim() })
      });

      setCommentDraft("");
      await loadDashboard();
      await loadBoard(board.id);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Nao foi possivel enviar o comentario."));
    } finally {
      setSaving(null);
    }
  }

  async function inviteUser() {
    if (!board || !inviteForm.email.trim()) return;

    setSaving("invite-user");
    setError(null);
    setMessage(null);

    try {
      await request(`/boards/${board.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteForm.email.trim(),
          role: inviteForm.role
        })
      });

      setInviteForm({ email: "", role: "MEMBER" });
      setInvitePanelOpen(false);
      setMessage("Convite enviado com sucesso.");
      await loadDashboard();
      await loadBoard(board.id);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Nao foi possivel enviar o convite."));
    } finally {
      setSaving(null);
    }
  }

  async function acceptInvitation(token: string) {
    setSaving("accept-invite");
    setError(null);
    setMessage(null);

    try {
      const acceptedBoard = await request<BoardData>("/boards/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token })
      });

      setMessage(`Voce entrou em "${acceptedBoard.title}".`);
      setActiveBoardId(acceptedBoard.id);
      setCurrentSection("boards");
      await loadDashboard();
      await loadBoards(acceptedBoard.id);
      setInviteToken("");

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        window.history.replaceState({}, "", url.toString());
      }
    } catch (caughtError) {
      setInviteToken("");
      setError(getErrorMessage(caughtError, "Nao foi possivel aceitar o convite."));
    } finally {
      setSaving(null);
    }
  }

  async function updateMemberPermissions(
    memberId: string,
    payload: Partial<BoardData["members"][number]["permissions"]> & { role?: BoardRole }
  ) {
    if (!board) return;

    setSaving(`member-permissions:${memberId}`);
    setError(null);
    setMessage(null);

    try {
      const nextBoard = await request<BoardData>(`/boards/${board.id}/members/${memberId}/permissions`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      setBoard(nextBoard);
      setMessage("Permissoes do membro atualizadas.");
      await loadDashboard();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Nao foi possivel atualizar as permissoes do membro."));
    } finally {
      setSaving(null);
    }
  }

  function openCard(card: BoardCard) {
    setActiveCardId(card.id);
    setActiveCardEditor(buildCardEditor(card));
    setCommentDraft("");
  }

  function closeCardModal() {
    setActiveCardId(null);
    setActiveCardEditor(null);
    setCommentDraft("");
  }

  function findColumnByTaskId(taskId: string) {
    return board?.lists.find((list) => list.cards.some((card) => card.id === taskId)) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    if (!board || !canWrite) return;

    const cardId = event.active.id as string;
    const column = findColumnByTaskId(cardId);
    if (!column) return;

    const card = column.cards.find((item) => item.id === cardId) ?? null;
    setDragState({ cardId, fromListId: column.id });
    setActiveOverlayCard(card);
  }

  async function moveCard(cardId: string, fromListId: string, toListId: string, position: number) {
    if (!board) return;

    const previousBoard = board;
    const adjustedPosition = getAdjustedPosition(board, cardId, fromListId, toListId, position);
    setBoard(moveCardLocally(board, cardId, fromListId, toListId, adjustedPosition));
    setSaving(`move-card:${cardId}`);
    setError(null);

    try {
      await request(`/boards/${board.id}/cards/${cardId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ fromListId, toListId, position: adjustedPosition })
      });

      await loadDashboard();
      await loadBoard(board.id);
    } catch (caughtError) {
      setBoard(previousBoard);
      setError(getErrorMessage(caughtError, "Nao foi possivel mover a tarefa."));
    } finally {
      setSaving(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveOverlayCard(null);

    if (!board || !dragState || !over) {
      setDragState(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeColumn = board.lists.find((list) => list.id === dragState.fromListId);
    const overColumn =
      board.lists.find((list) => list.cards.some((card) => card.id === overId)) ??
      board.lists.find((list) => list.id === overId);

    if (!activeColumn || !overColumn) {
      setDragState(null);
      return;
    }

    const activeIndex = activeColumn.cards.findIndex((card) => card.id === activeId);

    if (overColumn.id === activeColumn.id) {
      const overIndex = overColumn.cards.findIndex((card) => card.id === overId);
      if (overIndex === -1 || overIndex === activeIndex) {
        setDragState(null);
        return;
      }

      const reorderedCards = arrayMove(activeColumn.cards, activeIndex, overIndex);
      setBoard({
        ...board,
        lists: board.lists.map((list) =>
          list.id === activeColumn.id ? { ...list, cards: reorderedCards } : list
        )
      });

      await moveCard(activeId, activeColumn.id, activeColumn.id, overIndex);
      setDragState(null);
      return;
    }

    const overIndex = overColumn.cards.findIndex((card) => card.id === overId);
    const destinationIndex = overIndex >= 0 ? overIndex : overColumn.cards.length;
    await moveCard(activeId, activeColumn.id, overColumn.id, destinationIndex);
    setDragState(null);
  }

  useEffect(() => {
    if (!showWelcomeTransition) return;

    const timeout = window.setTimeout(() => {
      setShowWelcomeTransition(false);
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [showWelcomeTransition]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("kanban-workspace-theme");
    const storedSidebar = window.localStorage.getItem("kanban-sidebar-collapsed");

    if (storedTheme === "light" || storedTheme === "dark") {
      setWorkspaceTheme(storedTheme);
    }

    if (storedSidebar === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("kanban-workspace-theme", workspaceTheme);
  }, [workspaceTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("kanban-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  if (loading) {
    return (
      <section className="grid min-h-screen place-items-center bg-[#0c1424] text-slate-400">
        Carregando seu workspace...
      </section>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        authenticate={authenticate}
        confirmPasswordReset={confirmPasswordReset}
        error={error}
        forgotPasswordEmail={forgotPasswordEmail}
        forgotPasswordOpen={forgotPasswordOpen}
        handleRegister={handleRegister}
        loginForm={loginForm}
        message={message}
        mode={mode}
        registerForm={registerForm}
        rememberPassword={rememberPassword}
        requestPasswordReset={requestPasswordReset}
        resetPasswordForm={resetPasswordForm}
        resetToken={resetToken}
        saving={saving}
        setForgotPasswordEmail={setForgotPasswordEmail}
        setForgotPasswordOpen={setForgotPasswordOpen}
        setLoginForm={setLoginForm}
        setMode={setMode}
        setRegisterForm={setRegisterForm}
        setRememberPassword={setRememberPassword}
        setResetPasswordForm={setResetPasswordForm}
        setShowPassword={setShowPassword}
        setShowRegisterConfirm={setShowRegisterConfirm}
        setShowRegisterPassword={setShowRegisterPassword}
        showPassword={showPassword}
        showRegisterConfirm={showRegisterConfirm}
        showRegisterPassword={showRegisterPassword}
      />
    );
  }

  return (
    <section className="flex min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-text)]" style={workspaceThemeVars}>
      <AnimatePresence>
        {sidebarOpen ? (
          <>
            <motion.button
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
              initial={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              type="button"
            />
            <motion.div
              animate={{ x: 0 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
              initial={{ x: -300 }}
            >
              <KanbanSidebar
                activeBoardId={activeBoardId}
                boards={boards}
                board={board}
                canInvite={canInvite}
                collapsed={false}
                currentSection={currentSection}
                onSelect={(boardId) => {
                  setActiveBoardId(boardId);
                  setSidebarOpen(false);
                  void loadBoard(boardId);
                }}
                onInviteClick={() => setInvitePanelOpen(true)}
                onSectionChange={(section) => {
                  setCurrentSection(section);
                  setSidebarOpen(false);
                }}
                onToggleCollapse={() => undefined}
                onToggleTheme={() => setWorkspaceTheme((current) => (current === "dark" ? "light" : "dark"))}
                theme={workspaceTheme}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div className="hidden lg:block">
        <KanbanSidebar
          activeBoardId={activeBoardId}
          boards={boards}
          board={board}
          canInvite={canInvite}
          collapsed={sidebarCollapsed}
          currentSection={currentSection}
          onSelect={(boardId) => {
            setActiveBoardId(boardId);
            void loadBoard(boardId);
          }}
          onInviteClick={() => setInvitePanelOpen(true)}
          onSectionChange={setCurrentSection}
          onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
          onToggleTheme={() => setWorkspaceTheme((current) => (current === "dark" ? "light" : "dark"))}
          theme={workspaceTheme}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <KanbanHeader
          hasActiveFilters={hasActiveFilters}
          notificationCount={notifications.length}
          onFiltersClick={() => {
            setFiltersOpen((current) => !current);
            setNotificationsOpen(false);
          }}
          onNotificationsClick={() => {
            setNotificationsOpen((current) => !current);
            setFiltersOpen(false);
          }}
          onLogout={() => void logout()}
          onSearchChange={setSearchQuery}
          onToggleSidebar={() => setSidebarOpen(true)}
          searchQuery={searchQuery}
          userName={user.displayName}
        />

        {message ? (
          <div className="mx-6 mt-4 rounded-2xl border border-[color:var(--ui-accent-soft-border)] bg-[color:var(--ui-accent-soft-bg)] px-4 py-3 text-sm text-[color:var(--ui-accent-text-strong)]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mx-6 mt-4 rounded-2xl border border-rose-400/15 bg-rose-400/8 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        ) : null}

        <div className="relative z-10 mx-6 mt-4 flex justify-end">
          <AnimatePresence>
            {filtersOpen ? (
              <motion.section
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-5 shadow-[0_24px_60px_var(--ui-shadow)] backdrop-blur-xl"
                initial={{ opacity: 0, y: -8 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <span className="mb-1 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                      Filtros
                    </span>
                    <strong className="text-sm font-semibold text-[color:var(--ui-text)]">
                      Refine o quadro atual
                    </strong>
                  </div>
                  <button
                    className="text-sm text-[color:var(--ui-muted)] transition hover:text-[color:var(--ui-text)]"
                    onClick={() =>
                      setFilters({
                        priorities: [],
                        unassignedOnly: false,
                        assignedToMe: false,
                        dueSoon: false
                      })
                    }
                    type="button"
                  >
                    Limpar
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-[color:var(--ui-text)]">Prioridade</p>
                    <div className="flex flex-wrap gap-2">
                      {(["LOW", "MEDIUM", "HIGH"] as const).map((priority) => {
                        const active = filters.priorities.includes(priority);
                        return (
                          <button
                            className={`rounded-xl border px-3 py-2 text-sm transition ${
                              active
                                ? "border-[color:var(--ui-accent-soft-border)] bg-[color:var(--ui-accent-soft-bg)] text-[color:var(--ui-accent-text-strong)]"
                                : "border-[color:var(--ui-border)] text-[color:var(--ui-muted)] hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
                            }`}
                            key={priority}
                            onClick={() =>
                              setFilters((current) => ({
                                ...current,
                                priorities: current.priorities.includes(priority)
                                  ? current.priorities.filter((item) => item !== priority)
                                  : [...current.priorities, priority]
                              }))
                            }
                            type="button"
                          >
                            {priority === "LOW" ? "Baixa" : priority === "MEDIUM" ? "Media" : "Alta"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <FilterToggle
                      active={filters.unassignedOnly}
                      description="Mostra tarefas sem responsavel definido."
                      label="Sem responsavel"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          unassignedOnly: !current.unassignedOnly
                        }))
                      }
                    />
                    <FilterToggle
                      active={filters.assignedToMe}
                      description="Mostra apenas tarefas atribuidas a voce."
                      label="Atribuidas a mim"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          assignedToMe: !current.assignedToMe
                        }))
                      }
                    />
                    <FilterToggle
                      active={filters.dueSoon}
                      description="Mostra tarefas com prazo nos proximos 3 dias."
                      label="Prazos proximos"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          dueSoon: !current.dueSoon
                        }))
                      }
                    />
                  </div>
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {notificationsOpen ? (
              <motion.section
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-0 w-full max-w-md rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-5 shadow-[0_24px_60px_var(--ui-shadow)] backdrop-blur-xl"
                initial={{ opacity: 0, y: -8 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="mb-4">
                  <span className="mb-1 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                    Notificacoes
                  </span>
                  <strong className="text-sm font-semibold text-[color:var(--ui-text)]">
                    Atualizacoes do workspace
                  </strong>
                </div>

                <div className="space-y-3">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <article
                        className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-4"
                        key={notification.id}
                      >
                        <strong className="mb-1 block text-sm text-[color:var(--ui-text)]">
                          {notification.title}
                        </strong>
                        <p className="text-sm leading-6 text-[color:var(--ui-muted)]">
                          {notification.description}
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-4 text-sm text-[color:var(--ui-muted)]">
                      Nenhuma notificacao no momento.
                    </div>
                  )}
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {invitePanelOpen && board && currentSection === "team" ? (
            <InviteDrawer
              board={board}
              inviteForm={inviteForm}
              onClose={() => setInvitePanelOpen(false)}
              onInvite={() => void inviteUser()}
              saving={saving}
              setInviteForm={setInviteForm}
            />
          ) : null}
        </AnimatePresence>

        {currentSection === "dashboard" ? (
          <main className="min-h-[calc(100vh-4.5rem)] px-6 py-6">
            <section className="mx-auto grid max-w-6xl gap-6">
              <div className="rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-6">
                <span className="mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                  Dashboard
                </span>
                <h2 className="text-2xl font-semibold text-[color:var(--ui-text)]">
                  Visao geral dos seus quadros
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--ui-muted)]">
                  Acompanhe tudo que voce participa e veja as tarefas pendentes atribuidas a voce sem trocar de quadro.
                </p>
              </div>

              <section className="grid gap-4 lg:grid-cols-3">
                {dashboard.boards.map((item) => (
                  <button
                    className="rounded-[1.5rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-5 text-left transition hover:bg-[color:var(--ui-surface-hover)]"
                    key={item.id}
                    onClick={() => {
                      setActiveBoardId(item.id);
                      setCurrentSection("boards");
                      void loadBoard(item.id);
                    }}
                    type="button"
                  >
                    <span className="mb-1 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                      {item.role}
                    </span>
                    <strong className="block text-lg text-[color:var(--ui-text)]">{item.title}</strong>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <DashboardMetric label="Pendentes" value={item.pendingCards} />
                      <DashboardMetric label="Atribuidas" value={item.assignedToMe} />
                      <DashboardMetric label="Alta prioridade" value={item.highPriorityCards} />
                      <DashboardMetric label="Membros" value={item.memberCount} />
                    </div>
                  </button>
                ))}
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-5">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <span className="mb-1 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                        Convites pendentes
                      </span>
                      <strong className="text-sm font-semibold text-[color:var(--ui-text)]">
                        {dashboard.invitations.length} aguardando resposta
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dashboard.invitations.length > 0 ? (
                      dashboard.invitations.map((invitation) => (
                        <article
                          className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3"
                          key={invitation.id}
                        >
                          <div className="min-w-0">
                            <strong className="block truncate text-sm text-[color:var(--ui-text)]">
                              {invitation.boardTitle}
                            </strong>
                            <p className="truncate text-sm text-[color:var(--ui-muted)]">
                              {invitation.invitedByName} ·{" "}
                              {invitation.role === "ADMIN"
                                ? "Administrador"
                                : invitation.role === "MEMBER"
                                  ? "Colaborador"
                                  : "Visualizador"}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-[color:var(--ui-muted)]">
                            {formatDueDate(invitation.expiresAt) ?? "em breve"}
                          </span>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3 text-sm text-[color:var(--ui-muted)]">
                        Nenhum convite pendente.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-5">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <span className="mb-1 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                        Minhas tarefas pendentes
                      </span>
                      <strong className="text-sm font-semibold text-[color:var(--ui-text)]">
                        {dashboard.assignedTasks.length} aguardando sua acao
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dashboard.assignedTasks.length > 0 ? (
                      dashboard.assignedTasks.map((task) => (
                        <article
                          className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3"
                          key={task.id}
                        >
                          <div className="min-w-0">
                            <strong className="block truncate text-sm text-[color:var(--ui-text)]">
                              {task.title}
                            </strong>
                            <p className="truncate text-sm text-[color:var(--ui-muted)]">
                              {task.boardTitle} · {task.listTitle}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`rounded-xl border px-2.5 py-1 text-[0.72rem] font-semibold ${priorityMeta[task.priority].badgeClassName}`}
                            >
                              {priorityMeta[task.priority].label}
                            </span>
                            {task.dueDate ? (
                              <span className="text-xs font-medium text-[color:var(--ui-muted)]">
                                {formatDueDate(task.dueDate)}
                              </span>
                            ) : null}
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3 text-sm text-[color:var(--ui-muted)]">
                        Nenhuma tarefa pendente atribuida a voce.
                      </div>
                    )}
                  </div>
                </section>
              </section>
            </section>
          </main>
        ) : !board ? (
          <div className="grid min-h-[calc(100vh-4.5rem)] place-items-center px-6 text-slate-500">
            Nenhum quadro disponivel para voce.
          </div>
        ) : currentSection === "team" ? (
          <main className="min-h-[calc(100vh-4.5rem)] px-6 py-6">
            <section className="mx-auto grid max-w-5xl gap-6">
              <div className="rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-6">
                <span className="mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                  Equipe do quadro
                </span>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-[color:var(--ui-text)]">{board.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--ui-muted)]">
                      Gerencie quem participa do quadro atual, revise papeis e envie novos convites para o projeto.
                    </p>
                  </div>
                  {canInvite ? (
                    <button
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[color:var(--ui-accent)] px-5 text-sm font-semibold text-[color:var(--ui-accent-foreground)] transition hover:brightness-110"
                      onClick={() => setInvitePanelOpen((current) => !current)}
                      type="button"
                    >
                      Adicionar pessoa
                    </button>
                  ) : null}
                </div>
              </div>

              <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <span className="mb-1 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                        Membros
                      </span>
                      <strong className="text-sm font-semibold text-[color:var(--ui-text)]">
                        {board.members.length} pessoa(s) no quadro
                      </strong>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {board.members.map((member) => (
                      <article
                        className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3"
                        key={member.id}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--ui-accent-soft-bg)] text-sm font-semibold text-[color:var(--ui-accent-text-strong)]">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <strong className="block truncate text-sm text-[color:var(--ui-text)]">
                              {member.displayName}
                            </strong>
                            <span className="block truncate text-sm text-[color:var(--ui-muted)]">
                              {member.role}
                            </span>
                            <span className="mt-1 block text-xs text-[color:var(--ui-muted)]">
                              {member.isOnline ? "Online no kanban" : "Offline"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              member.isOnline ? "bg-[color:var(--ui-accent)]" : "bg-slate-400/50"
                            }`}
                          />
                          <span className="rounded-xl border border-[color:var(--ui-accent-soft-border)] bg-[color:var(--ui-accent-soft-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ui-accent-text-strong)]">
                            {member.role}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className="rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-5">
                  <span className="mb-1 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                    Convites
                  </span>
                  <strong className="text-sm font-semibold text-[color:var(--ui-text)]">
                    Status do quadro
                  </strong>

                  <div className="mt-4 grid gap-3">
                    {board.invitations.length > 0 ? (
                      board.invitations.map((invitation) => (
                        <article
                          className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-4"
                          key={invitation.id}
                        >
                          <strong className="block text-sm text-[color:var(--ui-text)]">
                            {invitation.invitedEmail}
                          </strong>
                          <p className="mt-1 text-sm leading-6 text-[color:var(--ui-muted)]">
                            Convite pendente como {invitation.role.toLowerCase()}.
                          </p>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-4 text-sm text-[color:var(--ui-muted)]">
                        Nenhum convite pendente neste quadro.
                      </div>
                    )}
                  </div>
                </aside>
              </section>
            </section>
          </main>
        ) : currentSection === "settings" ? (
          <main className="min-h-[calc(100vh-4.5rem)] px-6 py-6">
            <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-5">
                <span className="mb-1 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                  Configuracoes
                </span>
                <strong className="text-sm font-semibold text-[color:var(--ui-text)]">
                  Selecione um membro
                </strong>

                <div className="mt-4 grid gap-2">
                  {board.members.map((member) => (
                    <button
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                        selectedMember?.id === member.id
                          ? "bg-[color:var(--ui-accent-soft-bg)] text-[color:var(--ui-accent-text-strong)]"
                          : "bg-[color:var(--ui-surface)] text-[color:var(--ui-muted)] hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
                      }`}
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      type="button"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--ui-accent-soft-bg)] text-sm font-semibold text-[color:var(--ui-accent-text-strong)]">
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <strong className="block truncate text-sm">{member.displayName}</strong>
                        <span className="block truncate text-xs opacity-80">{member.role}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-6">
                {selectedMember ? (
                  <>
                    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <span className="mb-1 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                          Permissoes do membro
                        </span>
                        <h2 className="text-2xl font-semibold text-[color:var(--ui-text)]">
                          {selectedMember.displayName}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--ui-muted)]">
                          Revise o que esse membro pode fazer dentro do quadro atual.
                        </p>
                      </div>
                      <span className="rounded-xl border border-[color:var(--ui-accent-soft-border)] bg-[color:var(--ui-accent-soft-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ui-accent-text-strong)]">
                        {selectedMember.role}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <PermissionToggle
                        active={selectedMember.permissions.canManageMembers}
                        description="Gerencia membros e permissoes."
                        disabled={!canManageMembers || selectedMember.role === "OWNER"}
                        label="Gerenciar membros"
                        onClick={() =>
                          void updateMemberPermissions(selectedMember.id, {
                            canManageMembers: !selectedMember.permissions.canManageMembers
                          })
                        }
                        saving={saving === `member-permissions:${selectedMember.id}`}
                      />
                      <PermissionToggle
                        active={selectedMember.permissions.canInviteMembers}
                        description="Pode convidar pessoas para o quadro."
                        disabled={!canManageMembers || selectedMember.role === "OWNER"}
                        label="Convidar membros"
                        onClick={() =>
                          void updateMemberPermissions(selectedMember.id, {
                            canInviteMembers: !selectedMember.permissions.canInviteMembers
                          })
                        }
                        saving={saving === `member-permissions:${selectedMember.id}`}
                      />
                      <PermissionToggle
                        active={selectedMember.permissions.canCreateLists}
                        description="Cria novas etapas no board."
                        disabled={!canManageMembers || selectedMember.role === "OWNER"}
                        label="Criar listas"
                        onClick={() =>
                          void updateMemberPermissions(selectedMember.id, {
                            canCreateLists: !selectedMember.permissions.canCreateLists
                          })
                        }
                        saving={saving === `member-permissions:${selectedMember.id}`}
                      />
                      <PermissionToggle
                        active={selectedMember.permissions.canEditLists}
                        description="Edita nomes e estrutura das listas."
                        disabled={!canManageMembers || selectedMember.role === "OWNER"}
                        label="Editar listas"
                        onClick={() =>
                          void updateMemberPermissions(selectedMember.id, {
                            canEditLists: !selectedMember.permissions.canEditLists
                          })
                        }
                        saving={saving === `member-permissions:${selectedMember.id}`}
                      />
                      <PermissionToggle
                        active={selectedMember.permissions.canCreateCards}
                        description="Cria novas tarefas."
                        disabled={!canManageMembers || selectedMember.role === "OWNER"}
                        label="Criar tarefas"
                        onClick={() =>
                          void updateMemberPermissions(selectedMember.id, {
                            canCreateCards: !selectedMember.permissions.canCreateCards
                          })
                        }
                        saving={saving === `member-permissions:${selectedMember.id}`}
                      />
                      <PermissionToggle
                        active={selectedMember.permissions.canEditCards}
                        description="Edita tarefas existentes."
                        disabled={!canManageMembers || selectedMember.role === "OWNER"}
                        label="Editar tarefas"
                        onClick={() =>
                          void updateMemberPermissions(selectedMember.id, {
                            canEditCards: !selectedMember.permissions.canEditCards
                          })
                        }
                        saving={saving === `member-permissions:${selectedMember.id}`}
                      />
                      <PermissionToggle
                        active={selectedMember.permissions.canMoveCards}
                        description="Move cards entre listas."
                        disabled={!canManageMembers || selectedMember.role === "OWNER"}
                        label="Mover tarefas"
                        onClick={() =>
                          void updateMemberPermissions(selectedMember.id, {
                            canMoveCards: !selectedMember.permissions.canMoveCards
                          })
                        }
                        saving={saving === `member-permissions:${selectedMember.id}`}
                      />
                      <PermissionToggle
                        active={selectedMember.permissions.canComment}
                        description="Comenta nas tarefas do quadro."
                        disabled={!canManageMembers || selectedMember.role === "OWNER"}
                        label="Comentar"
                        onClick={() =>
                          void updateMemberPermissions(selectedMember.id, {
                            canComment: !selectedMember.permissions.canComment
                          })
                        }
                        saving={saving === `member-permissions:${selectedMember.id}`}
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-4 text-sm text-[color:var(--ui-muted)]">
                    Nenhum membro encontrado para configurar.
                  </div>
                )}
              </section>
            </section>
          </main>
        ) : (
          <DndContext
            collisionDetection={closestCorners}
            onDragEnd={(event) => void handleDragEnd(event)}
            onDragStart={handleDragStart}
            sensors={sensors}
          >
            <main className="flex min-h-[calc(100vh-4.5rem)] gap-6 overflow-x-auto px-6 py-6">
              {filteredLists.map((list, index) => (
                <KanbanColumn
                  canWrite={canWrite}
                  color={columnPalette[index % columnPalette.length]}
                  delayMs={index * 0.08}
                  draftTitle={listDrafts[list.id]?.title ?? ""}
                  key={list.id}
                  list={list}
                  onAddTask={() => void createCard(list.id)}
                  onCardOpen={openCard}
                  onDraftChange={(value) =>
                    setListDrafts((current) => ({ ...current, [list.id]: { title: value } }))
                  }
                />
              ))}

              {canWrite ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-80 shrink-0"
                  initial={{ opacity: 0, scale: 0.96 }}
                >
                  <div className="rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-4">
                    <div className="mb-4 flex items-center gap-3 px-1">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: columnPalette[boards.length % columnPalette.length] }}
                      />
                      <h2 className="text-sm font-semibold text-[color:var(--ui-text)]">Nova etapa</h2>
                    </div>

                    <div className="space-y-3">
                      <input
                        className="h-12 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 text-sm text-[color:var(--ui-text)] outline-none transition placeholder:text-[color:var(--ui-muted)] focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
                        onChange={(event) => setNewListTitle(event.target.value)}
                        placeholder="Nome da etapa"
                        value={newListTitle}
                      />
                      <button
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--ui-accent)] px-5 text-sm font-semibold text-[color:var(--ui-accent-foreground)] transition hover:brightness-110 disabled:opacity-60"
                        disabled={saving === "create-list"}
                        onClick={() => void createList()}
                        type="button"
                      >
                        <Plus size={16} />
                        <span>Adicionar etapa</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </main>

            <DragOverlay>
              {activeOverlayCard ? <KanbanCard card={activeOverlayCard} onOpen={openCard} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <AnimatePresence>
        {activeCard && activeCardEditor ? (
          <CardDialog
            activeCard={activeCard}
            activeCardEditor={activeCardEditor}
            board={board}
            commentDraft={commentDraft}
            onAddComment={() => void addComment()}
            onClose={closeCardModal}
            onSave={() => void updateCardDetails()}
            saving={saving}
            setActiveCardEditor={setActiveCardEditor}
            setCommentDraft={setCommentDraft}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showWelcomeTransition ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[70] grid place-items-center bg-[color:var(--ui-bg)]/82 px-6 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="w-full max-w-md rounded-[2rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-8 shadow-[0_30px_90px_var(--ui-shadow)]"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
            >
              <span className="mb-3 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                Bem-vindo
              </span>
              <strong className="block text-4xl font-semibold leading-[0.95] text-[color:var(--ui-text)]">
                {user.displayName}
              </strong>
              <p className="mt-3 text-sm leading-6 text-[color:var(--ui-muted)]">
                Estamos preparando seu workspace e carregando seus quadros.
              </p>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-[color:var(--ui-chip-bg)]">
                <motion.div
                  animate={{ scaleX: 1 }}
                  className="h-full origin-left rounded-full bg-gradient-to-r from-[color:var(--ui-accent)] to-sky-400"
                  initial={{ scaleX: 0.1 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function FilterToggle(props: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        props.active
          ? "border-[color:var(--ui-accent-soft-border)] bg-[color:var(--ui-accent-soft-bg)]"
          : "border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] hover:bg-[color:var(--ui-surface-hover)]"
      }`}
      onClick={props.onClick}
      type="button"
    >
      <div>
        <strong className="mb-1 block text-sm text-[color:var(--ui-text)]">{props.label}</strong>
        <p className="text-sm leading-6 text-[color:var(--ui-muted)]">{props.description}</p>
      </div>
      <span
        className={`mt-1 h-3.5 w-3.5 rounded-full border ${
          props.active
            ? "border-[color:var(--ui-accent)] bg-[color:var(--ui-accent)]"
            : "border-[color:var(--ui-border)] bg-transparent"
        }`}
      />
    </button>
  );
}

function DashboardMetric(props: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] px-4 py-3">
      <span className="block text-[0.72rem] uppercase tracking-[0.16em] text-[color:var(--ui-muted)]">
        {props.label}
      </span>
      <strong className="mt-2 block text-xl text-[color:var(--ui-text)]">{props.value}</strong>
    </div>
  );
}

function PermissionToggle(props: {
  active: boolean;
  label: string;
  description: string;
  disabled: boolean;
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-4 text-left transition ${
        props.active
          ? "border-[color:var(--ui-accent-soft-border)] bg-[color:var(--ui-accent-soft-bg)]"
          : "border-[color:var(--ui-border)] bg-[color:var(--ui-surface)]"
      } ${props.disabled ? "cursor-not-allowed opacity-60" : "hover:bg-[color:var(--ui-surface-hover)]"}`}
      disabled={props.disabled || props.saving}
      onClick={props.onClick}
      type="button"
    >
      <div>
        <strong className="mb-1 block text-sm text-[color:var(--ui-text)]">{props.label}</strong>
        <p className="text-sm leading-6 text-[color:var(--ui-muted)]">{props.description}</p>
      </div>
      <span
        className={`mt-1 inline-flex min-h-7 min-w-7 items-center justify-center rounded-full border text-xs font-semibold ${
          props.active
            ? "border-[color:var(--ui-accent)] bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-foreground)]"
            : "border-[color:var(--ui-border)] text-[color:var(--ui-muted)]"
        }`}
      >
        {props.saving ? "..." : props.active ? "ON" : "OFF"}
      </span>
    </button>
  );
}
