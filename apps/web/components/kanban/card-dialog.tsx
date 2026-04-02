"use client";

import type { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";
import { Calendar, MessageSquare, X } from "lucide-react";
import {
  formatDueDate,
  priorityMeta,
  type BoardCard,
  type BoardData,
  type CardEditorState,
  type CardPriority
} from "../../lib/kanban-types";

type ActiveCard = BoardCard & { listId: string; listTitle: string };

type Props = {
  board: BoardData | null;
  activeCard: ActiveCard;
  activeCardEditor: CardEditorState;
  setActiveCardEditor: Dispatch<SetStateAction<CardEditorState | null>>;
  commentDraft: string;
  setCommentDraft: Dispatch<SetStateAction<string>>;
  saving: string | null;
  onClose: () => void;
  onSave: () => void;
  onAddComment: () => void;
};

export function CardDialog(props: Props) {
  const priority = priorityMeta[props.activeCard.priority];
  const dueDate = formatDueDate(props.activeCard.dueDate);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/72 p-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
    >
      <motion.section
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-auto rounded-[2rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-6 shadow-[0_30px_90px_var(--ui-shadow)]"
        initial={{ opacity: 0, scale: 0.985, y: 18 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--ui-muted)]">
              {props.activeCard.listTitle}
            </span>
            <h2 className="text-2xl font-semibold text-[color:var(--ui-text)]">Detalhes do card</h2>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-2xl text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
            onClick={props.onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <FieldLabel title="Titulo" />
            <input
              className="h-12 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 text-sm text-[color:var(--ui-text)] outline-none transition focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
              onChange={(event) =>
                props.setActiveCardEditor((current) =>
                  current ? { ...current, title: event.target.value } : current
                )
              }
              value={props.activeCardEditor.title}
            />

            <FieldLabel title="Descricao" />
            <textarea
              className="min-h-32 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3 text-sm text-[color:var(--ui-text)] outline-none transition focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
              onChange={(event) =>
                props.setActiveCardEditor((current) =>
                  current ? { ...current, description: event.target.value } : current
                )
              }
              rows={5}
              value={props.activeCardEditor.description}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel title="Prioridade" />
                <select
                  className="h-12 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 text-sm text-[color:var(--ui-text)] outline-none transition focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
                  onChange={(event) =>
                    props.setActiveCardEditor((current) =>
                      current
                        ? { ...current, priority: event.target.value as CardPriority }
                        : current
                    )
                  }
                  value={props.activeCardEditor.priority}
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </select>
              </div>
              <div>
                <FieldLabel title="Prazo" />
                <input
                  className="h-12 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 text-sm text-[color:var(--ui-text)] outline-none transition focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
                  onChange={(event) =>
                    props.setActiveCardEditor((current) =>
                      current ? { ...current, dueDate: event.target.value } : current
                    )
                  }
                  type="date"
                  value={props.activeCardEditor.dueDate}
                />
              </div>
            </div>

            <FieldLabel title="Tags" />
            <input
              className="h-12 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 text-sm text-[color:var(--ui-text)] outline-none transition focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
              onChange={(event) =>
                props.setActiveCardEditor((current) =>
                  current ? { ...current, tagsText: event.target.value } : current
                )
              }
              placeholder="Design, Backend, Planejamento"
              value={props.activeCardEditor.tagsText}
            />

            <FieldLabel title="Responsavel" />
            <select
              className="h-12 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 text-sm text-[color:var(--ui-text)] outline-none transition focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
              onChange={(event) =>
                props.setActiveCardEditor((current) =>
                  current ? { ...current, assigneeId: event.target.value } : current
                )
              }
              value={props.activeCardEditor.assigneeId}
            >
              <option value="">Sem responsavel</option>
              {props.board?.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>

            <button
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[color:var(--ui-accent)] px-5 text-sm font-semibold text-[color:var(--ui-accent-foreground)] transition hover:brightness-110 disabled:opacity-60"
              disabled={props.saving === `update-card:${props.activeCard.id}`}
              onClick={props.onSave}
              type="button"
            >
              Salvar alteracoes
            </button>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-5">
            <div className="flex items-center justify-between gap-4">
              <span
                className={`inline-flex min-h-6 items-center rounded-xl border px-2.5 text-[0.72rem] font-semibold ${priority.badgeClassName}`}
              >
                {priority.label}
              </span>
              <div className="flex flex-wrap items-center gap-3 text-[0.74rem] text-[color:var(--ui-muted)]">
                {dueDate ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} />
                    {dueDate}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  {props.activeCard.comments.length}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[color:var(--ui-text)]">{props.activeCard.title}</h3>
              {props.activeCard.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {props.activeCard.tags.map((tag) => (
                    <span
                      className="inline-flex min-h-6 items-center rounded-xl border border-[color:var(--ui-accent-soft-border)] bg-[color:var(--ui-accent-soft-bg)] px-2.5 text-[0.72rem] font-semibold text-[color:var(--ui-accent-text)]"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {props.activeCard.comments.length > 0 ? (
                props.activeCard.comments.map((comment) => (
                  <article
                    className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-3"
                    key={comment.id}
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--ui-accent-soft-bg)] text-xs font-semibold text-[color:var(--ui-accent-text)]">
                      {comment.author.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong className="mb-1 block text-sm text-[color:var(--ui-text)]">
                        {comment.author.displayName}
                      </strong>
                      <p className="text-sm leading-6 text-[color:var(--ui-muted)]">{comment.content}</p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-4 text-sm text-[color:var(--ui-muted)]">
                  Nenhum comentario neste card ainda.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <textarea
                className="min-h-28 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3 text-sm text-[color:var(--ui-text)] outline-none transition placeholder:text-[color:var(--ui-muted)] focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
                onChange={(event) => props.setCommentDraft(event.target.value)}
                placeholder="Escreva um comentario..."
                rows={3}
                value={props.commentDraft}
              />
              <button
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[color:var(--ui-surface-hover)] px-4 text-sm font-medium text-[color:var(--ui-text)] transition hover:brightness-105 disabled:opacity-60"
                disabled={props.saving === `comment:${props.activeCard.id}`}
                onClick={props.onAddComment}
                type="button"
              >
                Enviar comentario
              </button>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function FieldLabel({ title }: { title: string }) {
  return <label className="mb-2 block text-sm font-medium text-[color:var(--ui-text)]">{title}</label>;
}
