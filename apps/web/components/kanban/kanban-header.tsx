"use client";

import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  Filter,
  LogOut,
  Menu,
  SlidersHorizontal,
  Search
} from "lucide-react";

type Props = {
  userName: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleSidebar: () => void;
  onLogout: () => void;
  onNotificationsClick: () => void;
  onFiltersClick: () => void;
  notificationCount: number;
  hasActiveFilters: boolean;
};

export function KanbanHeader(props: Props) {
  return (
    <header className="flex min-h-18 items-center justify-between gap-4 border-b border-[color:var(--ui-border-subtle)] bg-[color:var(--ui-header-bg)] px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <button
          className="grid h-10 w-10 place-items-center rounded-2xl text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)] lg:hidden"
          onClick={props.onToggleSidebar}
          type="button"
        >
          <Menu size={18} />
        </button>

        <div>
          <p className="mb-1 text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
            Seu workspace
          </p>
          <h1 className="text-lg font-semibold text-[color:var(--ui-text)]">
            Ola, <span className="text-[color:var(--ui-accent-text-strong)]">{props.userName}</span>
          </h1>
        </div>
      </div>

      <div className="relative hidden max-w-md flex-1 items-center md:flex">
        <Search className="pointer-events-none absolute left-4 text-[color:var(--ui-muted)]" size={16} />
        <input
          className="h-11 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] pl-11 pr-16 text-sm text-[color:var(--ui-text)] outline-none transition focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
          onChange={(event) => props.onSearchChange(event.target.value)}
          placeholder="Buscar tarefas, projetos..."
          value={props.searchQuery}
        />
        <kbd className="absolute right-3 rounded-md bg-[color:var(--ui-chip-bg)] px-2 py-0.5 text-[0.7rem] text-[color:var(--ui-muted)]">
          Ctrl+K
        </kbd>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-1 sm:flex">
          <button
            className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--ui-surface-hover)] text-[color:var(--ui-text)] shadow-[0_8px_18px_var(--ui-shadow)]"
            type="button"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        <button
          className={`hidden h-10 w-10 place-items-center rounded-2xl transition sm:grid ${
            props.hasActiveFilters
              ? "bg-[color:var(--ui-accent-soft-bg)] text-[color:var(--ui-accent-text-strong)]"
              : "text-[color:var(--ui-muted)] hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
          }`}
          onClick={props.onFiltersClick}
          type="button"
        >
          {props.hasActiveFilters ? <SlidersHorizontal size={18} /> : <Filter size={18} />}
        </button>

        <motion.button
          className={`relative grid h-10 w-10 place-items-center rounded-2xl transition ${
            props.notificationCount > 0
              ? "bg-[color:var(--ui-accent-soft-bg)] text-[color:var(--ui-accent-text-strong)]"
              : "text-[color:var(--ui-muted)] hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
          }`}
          onClick={props.onNotificationsClick}
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          {props.notificationCount > 0 ? <BellRing size={18} /> : <Bell size={18} />}
          {props.notificationCount > 0 ? (
            <>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[color:var(--ui-accent)] shadow-[0_0_0_0_var(--ui-accent-pulse)] animate-pulse" />
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[color:var(--ui-accent)] px-1 text-[0.65rem] font-semibold text-[color:var(--ui-accent-foreground)]">
                {props.notificationCount > 9 ? "9+" : props.notificationCount}
              </span>
            </>
          ) : null}
        </motion.button>

        <button
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[color:var(--ui-border)] px-4 text-sm font-medium text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
          onClick={props.onLogout}
          type="button"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
