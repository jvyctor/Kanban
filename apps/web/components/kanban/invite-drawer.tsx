"use client";

import type { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { BoardData, BoardRole } from "../../lib/kanban-types";

type Props = {
  board: BoardData;
  inviteForm: { email: string; role: BoardRole };
  setInviteForm: Dispatch<SetStateAction<{ email: string; role: BoardRole }>>;
  onClose: () => void;
  onInvite: () => void;
  saving: string | null;
};

export function InviteDrawer(props: Props) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="mx-6 mt-4 rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-5 backdrop-blur-xl"
      initial={{ opacity: 0, y: -10 }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <span className="mb-1 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
            Convites
          </span>
          <strong className="text-sm font-semibold text-[color:var(--ui-text)]">
            Convidar para {props.board.title}
          </strong>
        </div>
        <button
          className="grid h-9 w-9 place-items-center rounded-xl text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
          onClick={props.onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_auto]">
        <input
          className="h-12 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 text-sm text-[color:var(--ui-text)] outline-none transition placeholder:text-[color:var(--ui-muted)] focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
          onChange={(event) =>
            props.setInviteForm((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="email@empresa.com"
          value={props.inviteForm.email}
        />
        <select
          className="h-12 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 text-sm text-[color:var(--ui-text)] outline-none transition focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
          onChange={(event) =>
            props.setInviteForm((current) => ({
              ...current,
              role: event.target.value as BoardRole
            }))
          }
          value={props.inviteForm.role}
        >
          {props.board.role === "OWNER" ? <option value="ADMIN">Administrador</option> : null}
          <option value="MEMBER">Colaborador</option>
          <option value="VIEWER">Visualizador</option>
        </select>
        <button
          className="h-12 rounded-2xl bg-[color:var(--ui-accent)] px-5 text-sm font-semibold text-[color:var(--ui-accent-foreground)] transition hover:brightness-110 disabled:opacity-60"
          disabled={props.saving === "invite-user"}
          onClick={props.onInvite}
          type="button"
        >
          Enviar convite
        </button>
      </div>
    </motion.section>
  );
}
