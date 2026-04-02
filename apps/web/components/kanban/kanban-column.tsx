"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, Plus } from "lucide-react";
import type { BoardCard, BoardList } from "../../lib/kanban-types";
import { KanbanCard } from "./kanban-card";

type Props = {
  list: BoardList;
  color: string;
  canWrite: boolean;
  delayMs?: number;
  draftTitle: string;
  onDraftChange: (value: string) => void;
  onAddTask: () => void;
  onCardOpen: (card: BoardCard) => void;
};

export function KanbanColumn(props: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: props.list.id });
  const [isAddingTask, setIsAddingTask] = useState(false);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex w-80 shrink-0 flex-col"
      initial={{ opacity: 0, y: 22 }}
      transition={{ delay: props.delayMs ?? 0, duration: 0.35 }}
    >
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: props.color }} />
          <h2 className="text-sm font-semibold text-[color:var(--ui-text)]">{props.list.title}</h2>
          <span className="rounded-full bg-[color:var(--ui-chip-bg)] px-2 py-0.5 text-[0.72rem] font-medium text-[color:var(--ui-muted)]">
            {props.list.cards.length}
          </span>
        </div>
        <button
          className="grid h-8 w-8 place-items-center rounded-xl text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
          type="button"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div
        className={`min-h-[220px] rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-panel)] p-3 transition ${
          isOver ? "ring-2 ring-[color:var(--ui-accent-ring)]" : ""
        }`}
        ref={setNodeRef}
      >
        <SortableContext items={props.list.cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            <AnimatePresence>
              {props.list.cards.map((card) => (
                <KanbanCard card={card} key={card.id} onOpen={props.onCardOpen} />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>

        {props.canWrite ? (
          <AnimatePresence mode="wait">
            {isAddingTask ? (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                key="composer"
              >
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3 text-sm text-[color:var(--ui-text)] outline-none transition placeholder:text-[color:var(--ui-muted)] focus:border-[color:var(--ui-accent-soft-border)] focus:ring-4 focus:ring-[color:var(--ui-accent-ring)]"
                  onChange={(event) => props.onDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      props.onAddTask();
                      setIsAddingTask(false);
                    }
                    if (event.key === "Escape") {
                      setIsAddingTask(false);
                      props.onDraftChange("");
                    }
                  }}
                  placeholder="Digite o titulo da tarefa..."
                  rows={2}
                  value={props.draftTitle}
                />
                <div className="mt-3 flex items-center gap-3">
                  <button
                    className="rounded-xl bg-[color:var(--ui-accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--ui-accent-foreground)] transition hover:brightness-110"
                    onClick={() => {
                      props.onAddTask();
                      setIsAddingTask(false);
                    }}
                    type="button"
                  >
                    Adicionar
                  </button>
                  <button
                    className="text-sm text-[color:var(--ui-muted)] transition hover:text-[color:var(--ui-text)]"
                    onClick={() => {
                      setIsAddingTask(false);
                      props.onDraftChange("");
                    }}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                animate={{ opacity: 1 }}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-surface-hover)] hover:text-[color:var(--ui-text)]"
                initial={{ opacity: 0 }}
                key="trigger"
                onClick={() => setIsAddingTask(true)}
                type="button"
              >
                <Plus className="transition group-hover:scale-110" size={16} />
                <span>Nova tarefa</span>
              </motion.button>
            )}
          </AnimatePresence>
        ) : null}
      </div>
    </motion.div>
  );
}
