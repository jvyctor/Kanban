"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Calendar, MessageSquare, MoreHorizontal, Paperclip, User } from "lucide-react";
import {
  formatDueDate,
  priorityMeta,
  type BoardCard
} from "../../lib/kanban-types";

type Props = {
  card: BoardCard;
  onOpen: (card: BoardCard) => void;
};

export function KanbanCard(props: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.card.id
  });

  const dueDate = formatDueDate(props.card.dueDate);
  const priority = priorityMeta[props.card.priority];

  return (
    <motion.article
      {...attributes}
      {...listeners}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-3xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-4 shadow-[0_18px_36px_var(--ui-shadow)] transition hover:border-[color:var(--ui-accent-soft-border)] hover:bg-[color:var(--ui-surface-hover)] ${
        isDragging ? "z-50 rotate-2 opacity-70" : "cursor-grab active:cursor-grabbing"
      }`}
      initial={{ opacity: 0, y: 10 }}
      onClick={() => props.onOpen(props.card)}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex min-h-6 items-center rounded-xl border px-2.5 text-[0.72rem] font-semibold ${priority.badgeClassName}`}
          >
            {priority.label}
          </span>
          {props.card.tags.map((tag) => (
            <span
              className="inline-flex min-h-6 items-center rounded-xl border border-[color:var(--ui-accent-soft-border)] bg-[color:var(--ui-accent-soft-bg)] px-2.5 text-[0.72rem] font-semibold text-[color:var(--ui-accent-text)]"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          className="grid h-7 w-7 place-items-center rounded-xl text-[color:var(--ui-muted)] opacity-0 transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)] group-hover:opacity-100"
          type="button"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      <h3 className="mb-2 text-[0.98rem] font-semibold text-[color:var(--ui-text)]">{props.card.title}</h3>
      {props.card.description ? (
        <p className="mb-3 text-sm leading-6 text-[color:var(--ui-muted)]">{props.card.description}</p>
      ) : null}

      <div className="mt-4 border-t border-[color:var(--ui-border-subtle)] pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--ui-muted)]">
              Responsavel
            </span>
            <strong className="block truncate text-sm text-[color:var(--ui-text)]">
              {props.card.assignee?.displayName ?? "Nao definido"}
            </strong>
          </div>

          {props.card.assignee ? (
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--ui-accent-soft-bg)] text-xs font-semibold text-[color:var(--ui-accent-text)] ring-2 ring-[color:var(--ui-bg)]">
              {props.card.assignee.displayName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-[color:var(--ui-border)] text-[color:var(--ui-muted)]">
              <User size={14} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[0.74rem] text-[color:var(--ui-muted)]">
          {dueDate ? (
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              {dueDate}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare size={14} />
            {props.card.comments.length}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Paperclip size={14} />
            0
          </span>
        </div>
      </div>
    </motion.article>
  );
}
