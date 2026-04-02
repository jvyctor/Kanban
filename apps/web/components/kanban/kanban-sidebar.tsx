"use client";

import { motion } from "framer-motion";
import {
  ChevronRight,
  HelpCircle,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sparkles,
  Sun,
  UserPlus,
  Users
} from "lucide-react";
import { getRoleLabel, sidebarMenu, type BoardData, type BoardSummary } from "../../lib/kanban-types";

type Props = {
  boards: BoardSummary[];
  activeBoardId: string | null;
  onSelect: (boardId: string) => void;
  currentSection: "dashboard" | "boards" | "team" | "settings";
  onSectionChange: (section: "dashboard" | "boards" | "team" | "settings") => void;
  board: BoardData | null;
  canInvite: boolean;
  onInviteClick: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

export function KanbanSidebar(props: Props) {
  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className={`flex h-full flex-col border-r border-[color:var(--ui-border-subtle)] bg-[color:var(--ui-sidebar-bg)] transition-all duration-300 ${
        props.collapsed ? "w-[5.5rem]" : "w-72"
      }`}
      initial={{ opacity: 0, x: -18 }}
    >
      <div className="border-b border-[color:var(--ui-border-subtle)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--ui-accent-soft-bg)] text-[color:var(--ui-accent-text-strong)]">
              <Sparkles size={18} />
            </div>
            {!props.collapsed ? (
              <div className="min-w-0">
                <strong className="block truncate text-sm font-semibold text-[color:var(--ui-text)]">Kanban Pro</strong>
                <span className="text-xs text-[color:var(--ui-muted)]">Workspace</span>
              </div>
            ) : null}
          </div>

          {!props.collapsed ? (
            <div className="flex items-center gap-2">
              <button
                className="grid h-9 w-9 place-items-center rounded-xl text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
                onClick={props.onToggleTheme}
                type="button"
              >
                {props.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          ) : null}
        </div>

        {props.collapsed ? (
          <div className="mt-3 grid gap-2">
            <button
              className="grid h-9 w-full place-items-center rounded-xl text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
              onClick={props.onToggleTheme}
              type="button"
            >
              {props.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              className="grid h-9 w-full place-items-center rounded-xl text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
              onClick={props.onToggleCollapse}
              type="button"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        ) : (
          <button
            className="mt-3 grid h-9 w-9 place-items-center rounded-xl text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
            onClick={props.onToggleCollapse}
            type="button"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        <div className="space-y-1.5">
          {sidebarMenu.map((item) => (
            <motion.button
              className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-medium transition ${
                (item.label === "Dashboard" && props.currentSection === "dashboard") ||
                (item.label === "Quadros" && props.currentSection === "boards") ||
                (item.label === "Equipe" && props.currentSection === "team") ||
                (item.label === "Configuracoes" && props.currentSection === "settings")
                  ? "bg-[color:var(--ui-accent-soft-bg)] text-[color:var(--ui-accent-text-strong)]"
                  : "text-[color:var(--ui-muted)] hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
              }`}
              key={item.label}
              onClick={() => {
                if (item.label === "Equipe") {
                  props.onSectionChange("team");
                  return;
                }
                if (item.label === "Quadros") {
                  props.onSectionChange("boards");
                  return;
                }
                if (item.label === "Dashboard") {
                  props.onSectionChange("dashboard");
                  return;
                }
                if (item.label === "Configuracoes") {
                  props.onSectionChange("settings");
                }
              }}
              type="button"
              whileHover={{ x: 4 }}
            >
              <item.icon size={18} />
              {!props.collapsed ? <span>{item.label}</span> : null}
            </motion.button>
          ))}
        </div>

        <div>
          {!props.collapsed ? (
            <div className="mb-3 flex items-center justify-between px-3">
              <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                Seus quadros
              </span>
              <button
                className="grid h-7 w-7 place-items-center rounded-lg text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
                type="button"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : null}

          <div className="space-y-1.5">
            {props.boards.map((board) => (
              <motion.button
                className={`flex h-11 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm transition ${
                  props.activeBoardId === board.id
                    ? "bg-[color:var(--ui-accent-soft-bg)] text-[color:var(--ui-accent-text-strong)]"
                    : "text-[color:var(--ui-muted)] hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
                }`}
                key={board.id}
                onClick={() => {
                  props.onSectionChange("boards");
                  props.onSelect(board.id);
                }}
                type="button"
                whileHover={{ x: 4 }}
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                {!props.collapsed ? <span className="truncate font-medium">{board.title}</span> : null}
                {!props.collapsed ? <ChevronRight className="ml-auto opacity-45" size={14} /> : null}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          {!props.collapsed ? (
            <button
              className={`mb-3 flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition ${
                props.currentSection === "team"
                  ? "bg-[color:var(--ui-accent-soft-bg)] text-[color:var(--ui-accent-text-strong)]"
                  : "text-[color:var(--ui-muted)] hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
              }`}
              onClick={() => props.onSectionChange("team")}
              type="button"
            >
              <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
                Equipe
              </span>
              <Users className="text-[color:var(--ui-muted)]" size={14} />
            </button>
          ) : null}

          <div className="space-y-1.5">
            {props.board?.members.slice(0, props.collapsed ? 3 : 5).map((member) => (
              <motion.div
                className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm"
                key={member.id}
                whileHover={{ x: props.collapsed ? 0 : 4 }}
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--ui-accent-soft-bg)] text-xs font-semibold text-[color:var(--ui-accent-text-strong)]">
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
                {!props.collapsed ? (
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-[color:var(--ui-text)]">
                      {member.displayName}
                    </strong>
                    <span className="block truncate text-xs text-[color:var(--ui-muted)]">
                      {member.isOnline ? "Online no kanban" : getRoleLabel(member.role)}
                    </span>
                  </div>
                ) : null}
                {member.isOnline ? (
                  <span className="ml-auto h-2.5 w-2.5 rounded-full bg-[color:var(--ui-accent)]" />
                ) : null}
              </motion.div>
            ))}

            {props.canInvite ? (
              <motion.button
                className={`flex h-11 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-medium transition ${
                  props.collapsed
                    ? "justify-center"
                    : "text-[color:var(--ui-muted)] hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
                }`}
                onClick={props.onInviteClick}
                type="button"
                whileHover={{ x: props.collapsed ? 0 : 4 }}
              >
                <UserPlus size={18} />
                {!props.collapsed ? <span>Adicionar ao quadro</span> : null}
              </motion.button>
            ) : null}
          </div>
        </div>
      </nav>

      <div className="border-t border-[color:var(--ui-border-subtle)] p-4">
        <motion.button
          className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-medium text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)] ${
            props.collapsed ? "justify-center px-0" : ""
          }`}
          type="button"
          whileHover={{ x: 4 }}
        >
          <HelpCircle size={18} />
          {!props.collapsed ? <span>Ajuda</span> : null}
        </motion.button>
      </div>
    </motion.aside>
  );
}
