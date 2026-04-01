"use client";

import { startTransition, useEffect, useState } from "react";
import { io } from "socket.io-client";

type BoardCard = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  position: number;
};

type BoardList = {
  id: string;
  title: string;
  position: number;
  cards: BoardCard[];
};

type BoardData = {
  id: string;
  title: string;
  lists: BoardList[];
};

type BoardClientProps = {
  apiUrl: string;
  boardId: string;
};

type DragState = {
  cardId: string;
  fromListId: string;
} | null;

type DropTarget = {
  listId: string;
  position: number;
} | null;

type CardDraft = {
  title: string;
  description: string;
  assignee: string;
};

type BoardUpdatedEvent = {
  type: string;
  board: BoardData;
};

function moveCardLocally(
  board: BoardData,
  cardId: string,
  fromListId: string,
  toListId: string,
  position: number
) {
  const lists = board.lists.map((list) => ({
    ...list,
    cards: [...list.cards]
  }));

  const fromList = lists.find((list) => list.id === fromListId);
  const toList = lists.find((list) => list.id === toListId);

  if (!fromList || !toList) {
    return board;
  }

  const currentIndex = fromList.cards.findIndex((card) => card.id === cardId);

  if (currentIndex === -1) {
    return board;
  }

  const [card] = fromList.cards.splice(currentIndex, 1);
  const targetIndex = Math.min(Math.max(position, 0), toList.cards.length);
  toList.cards.splice(targetIndex, 0, card);

  return {
    ...board,
    lists
  };
}

function getAdjustedPosition(
  board: BoardData,
  cardId: string,
  fromListId: string,
  toListId: string,
  position: number
) {
  if (fromListId !== toListId) {
    return position;
  }

  const list = board.lists.find((item) => item.id === fromListId);

  if (!list) {
    return position;
  }

  const currentIndex = list.cards.findIndex((card) => card.id === cardId);

  if (currentIndex === -1) {
    return position;
  }

  if (position > currentIndex) {
    return position - 1;
  }

  return position;
}

function emptyCardDraft(): CardDraft {
  return {
    title: "",
    description: "",
    assignee: ""
  };
}

export function BoardClient({ apiUrl, boardId }: BoardClientProps) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [editingList, setEditingList] = useState<{
    listId: string;
    title: string;
  } | null>(null);
  const [newCardDrafts, setNewCardDrafts] = useState<Record<string, CardDraft>>({});
  const [editingCard, setEditingCard] = useState<{
    cardId: string;
    title: string;
    description: string;
    assignee: string;
  } | null>(null);

  async function loadBoard() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/boards/${boardId}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Nao foi possivel carregar o board.");
      }

      const data = (await response.json()) as BoardData;
      setBoard(data);
    } catch {
      setError("Nao foi possivel carregar o board.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBoard();
  }, [apiUrl, boardId]);

  useEffect(() => {
    const socket = io(apiUrl, {
      withCredentials: true
    });

    function joinBoard() {
      socket.emit("board:join", { boardId });
    }

    function handleBoardUpdated(event: BoardUpdatedEvent) {
      startTransition(() => {
        setBoard(event.board);
        setError(null);
      });
    }

    socket.on("connect", () => {
      setSocketConnected(true);
      joinBoard();
    });
    socket.on("disconnect", () => {
      setSocketConnected(false);
    });
    socket.on("board:updated", handleBoardUpdated);

    return () => {
      socket.off("board:updated", handleBoardUpdated);
      socket.disconnect();
    };
  }, [apiUrl, boardId]);

  function updateDraft(
    listId: string,
    field: keyof CardDraft,
    value: string
  ) {
    setNewCardDrafts((current) => ({
      ...current,
      [listId]: {
        ...(current[listId] ?? emptyCardDraft()),
        [field]: value
      }
    }));
  }

  async function sendMutation(
    path: string,
    method: string,
    body: unknown,
    currentSavingKey: string
  ) {
    setSavingKey(currentSavingKey);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error("Falha na atualizacao do board.");
      }

      if (!socketConnected) {
        await loadBoard();
      }
    } catch {
      setError("Falha na atualizacao do board.");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleMoveCard(
    cardId: string,
    fromListId: string,
    toListId: string,
    position: number
  ) {
    if (!board || movingCardId || savingKey) {
      return;
    }

    const previousBoard = board;
    const adjustedPosition = getAdjustedPosition(
      board,
      cardId,
      fromListId,
      toListId,
      position
    );
    const nextBoard = moveCardLocally(
      board,
      cardId,
      fromListId,
      toListId,
      adjustedPosition
    );

    setMovingCardId(cardId);
    setError(null);
    setBoard(nextBoard);

    try {
      const response = await fetch(
        `${apiUrl}/boards/${boardId}/cards/${cardId}/move`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fromListId,
            toListId,
            position: adjustedPosition
          })
        }
      );

      if (!response.ok) {
        throw new Error("Nao foi possivel mover o card.");
      }

      if (!socketConnected) {
        await loadBoard();
      }
    } catch {
      setBoard(previousBoard);
      setError("O movimento falhou e o board foi restaurado.");
    } finally {
      setMovingCardId(null);
      setDragState(null);
      setDropTarget(null);
    }
  }

  function handleDragStart(cardId: string, fromListId: string) {
    setError(null);
    setDragState({ cardId, fromListId });
  }

  function handleDragEnd() {
    setDragState(null);
    setDropTarget(null);
  }

  async function handleDrop(listId: string, position: number) {
    if (!dragState || !board) {
      return;
    }

    const sourceList = board.lists.find((list) => list.id === dragState.fromListId);

    if (!sourceList) {
      setDragState(null);
      setDropTarget(null);
      return;
    }

    const currentIndex = sourceList.cards.findIndex(
      (card) => card.id === dragState.cardId
    );
    const adjustedPosition = getAdjustedPosition(
      board,
      dragState.cardId,
      dragState.fromListId,
      listId,
      position
    );

    if (
      dragState.fromListId === listId &&
      (currentIndex === adjustedPosition || currentIndex + 1 === position)
    ) {
      setDragState(null);
      setDropTarget(null);
      return;
    }

    await handleMoveCard(
      dragState.cardId,
      dragState.fromListId,
      listId,
      position
    );
  }

  async function handleCreateList() {
    const title = newListTitle.trim();

    if (!title) {
      return;
    }

    await sendMutation(
      `/boards/${boardId}/lists`,
      "POST",
      { title },
      "create-list"
    );
    setNewListTitle("");
  }

  async function handleUpdateList() {
    if (!editingList) {
      return;
    }

    const title = editingList.title.trim();

    if (!title) {
      return;
    }

    await sendMutation(
      `/boards/${boardId}/lists/${editingList.listId}`,
      "PATCH",
      { title },
      `update-list:${editingList.listId}`
    );
    setEditingList(null);
  }

  async function handleCreateCard(listId: string) {
    const draft = newCardDrafts[listId] ?? emptyCardDraft();
    const title = draft.title.trim();

    if (!title) {
      return;
    }

    await sendMutation(
      `/boards/${boardId}/cards`,
      "POST",
      {
        listId,
        title,
        description: draft.description.trim(),
        assignee: draft.assignee.trim()
      },
      `create-card:${listId}`
    );

    setNewCardDrafts((current) => ({
      ...current,
      [listId]: emptyCardDraft()
    }));
  }

  async function handleUpdateCard() {
    if (!editingCard) {
      return;
    }

    const title = editingCard.title.trim();

    if (!title) {
      return;
    }

    await sendMutation(
      `/boards/${boardId}/cards/${editingCard.cardId}`,
      "PATCH",
      {
        title,
        description: editingCard.description.trim(),
        assignee: editingCard.assignee.trim()
      },
      `update-card:${editingCard.cardId}`
    );
    setEditingCard(null);
  }

  if (isLoading) {
    return (
      <section className="live-board">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Board ao vivo</span>
            <h2>Carregando dados do workspace</h2>
          </div>
        </div>
        <div className="glass empty-state">Carregando board...</div>
      </section>
    );
  }

  if (!board) {
    return (
      <section className="live-board">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Board ao vivo</span>
            <h2>Falha ao consultar a API</h2>
          </div>
          <button className="ghost-button" onClick={() => void loadBoard()} type="button">
            Tentar novamente
          </button>
        </div>
        <div className="glass empty-state">{error}</div>
      </section>
    );
  }

  return (
    <section className="live-board">
      <div className="section-heading">
        <div className="stack">
          <span className="eyebrow">Board ao vivo</span>
          <h2>{board.title}</h2>
          <p className="section-copy">
            O board agora persiste no Postgres, recebe broadcasts por Socket.IO
            e permite criar ou editar listas e cards sem sair da tela.
          </p>
        </div>

        <div className="toolbar">
          <span className="status-pill">
            {socketConnected ? "Realtime conectado" : "Realtime offline"}
          </span>
          <button className="ghost-button" onClick={() => void loadBoard()} type="button">
            Atualizar
          </button>
        </div>
      </div>

      {error ? <div className="inline-alert">{error}</div> : null}

      <div className="glass creation-panel">
        <div className="panel-header">
          <div>
            <span className="tiny-label">Nova lista</span>
            <strong>Adicione outra etapa ao fluxo</strong>
          </div>
          <span className="tiny-label">
            {savingKey === "create-list" ? "Salvando..." : "Persistido na API"}
          </span>
        </div>
        <div className="form-grid compact">
          <input
            className="kanban-input"
            onChange={(event) => setNewListTitle(event.target.value)}
            placeholder="Ex.: Review"
            value={newListTitle}
          />
          <button
            className="ghost-button"
            disabled={savingKey === "create-list"}
            onClick={() => void handleCreateList()}
            type="button"
          >
            Criar lista
          </button>
        </div>
      </div>

      <div className="board-shell">
        {board.lists.map((list, listIndex) => {
          const draft = newCardDrafts[list.id] ?? emptyCardDraft();
          const isEditingList = editingList?.listId === list.id;

          return (
            <article className="glass board-column" key={list.id}>
              <header className="column-header">
                <div>
                  <div className="column-title">{list.title}</div>
                  <strong>{list.cards.length} itens</strong>
                </div>
                <div className="header-actions">
                  <span className="tiny-label">Lane {listIndex + 1}</span>
                  <button
                    className="text-button"
                    onClick={() =>
                      setEditingList({
                        listId: list.id,
                        title: list.title
                      })
                    }
                    type="button"
                  >
                    Editar lista
                  </button>
                </div>
              </header>

              {isEditingList ? (
                <div className="form-grid compact">
                  <input
                    className="kanban-input"
                    onChange={(event) =>
                      setEditingList({
                        listId: list.id,
                        title: event.target.value
                      })
                    }
                    value={editingList.title}
                  />
                  <button
                    className="ghost-button"
                    disabled={savingKey === `update-list:${list.id}`}
                    onClick={() => void handleUpdateList()}
                    type="button"
                  >
                    Salvar
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setEditingList(null)}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              ) : null}

              <div
                className={`stack board-dropzone ${
                  dropTarget?.listId === list.id ? "is-targeted" : ""
                }`}
                onDragEnter={() =>
                  setDropTarget({ listId: list.id, position: list.cards.length })
                }
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void handleDrop(list.id, list.cards.length)}
              >
                <div className="lane-transfer-zone" />

                {list.cards.length === 0 ? (
                  <>
                    <div
                      className={`drop-slot ${
                        dropTarget?.listId === list.id && dropTarget.position === 0
                          ? "is-active"
                          : ""
                      }`}
                      onDragEnter={() => setDropTarget({ listId: list.id, position: 0 })}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => void handleDrop(list.id, 0)}
                    />
                    <div className="empty-lane">Solte um card aqui.</div>
                  </>
                ) : null}

                {list.cards.map((card, cardIndex) => {
                  const isEditingCard = editingCard?.cardId === card.id;

                  return (
                    <div className="card-stack" key={card.id}>
                      <div
                        className={`drop-slot ${
                          dropTarget?.listId === list.id &&
                          dropTarget.position === cardIndex
                            ? "is-active"
                            : ""
                        }`}
                        onDragEnter={() =>
                          setDropTarget({ listId: list.id, position: cardIndex })
                        }
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => void handleDrop(list.id, cardIndex)}
                      />

                      <div
                        className={`task-card accent ${
                          dragState?.cardId === card.id ? "is-dragging" : ""
                        }`}
                        draggable={!movingCardId && !savingKey}
                        onDragEnd={handleDragEnd}
                        onDragStart={() => handleDragStart(card.id, list.id)}
                      >
                        {isEditingCard ? (
                          <div className="form-grid">
                            <input
                              className="kanban-input"
                              onChange={(event) =>
                                setEditingCard({
                                  ...editingCard,
                                  title: event.target.value
                                })
                              }
                              value={editingCard.title}
                            />
                            <textarea
                              className="kanban-textarea"
                              onChange={(event) =>
                                setEditingCard({
                                  ...editingCard,
                                  description: event.target.value
                                })
                              }
                              rows={3}
                              value={editingCard.description}
                            />
                            <input
                              className="kanban-input"
                              onChange={(event) =>
                                setEditingCard({
                                  ...editingCard,
                                  assignee: event.target.value
                                })
                              }
                              placeholder="Responsavel"
                              value={editingCard.assignee}
                            />
                            <div className="inline-actions">
                              <button
                                className="ghost-button"
                                disabled={savingKey === `update-card:${card.id}`}
                                onClick={() => void handleUpdateCard()}
                                type="button"
                              >
                                Salvar
                              </button>
                              <button
                                className="text-button"
                                onClick={() => setEditingCard(null)}
                                type="button"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="card-head">
                              <span className="card-chip">{card.assignee}</span>
                              <button
                                className="text-button"
                                onClick={() =>
                                  setEditingCard({
                                    cardId: card.id,
                                    title: card.title,
                                    description: card.description,
                                    assignee:
                                      card.assignee === "Sem responsavel"
                                        ? ""
                                        : card.assignee
                                  })
                                }
                                type="button"
                              >
                                Editar
                              </button>
                            </div>
                            <h3>{card.title}</h3>
                            <p>{card.description || "Sem descricao."}</p>
                            <div className="task-meta">
                              <span>{card.id}</span>
                              <span>
                                {movingCardId === card.id ? "Movendo..." : "Arraste"}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div
                  className={`drop-slot ${
                    dropTarget?.listId === list.id &&
                    dropTarget.position === list.cards.length
                      ? "is-active"
                      : ""
                  }`}
                  onDragEnter={() =>
                    setDropTarget({ listId: list.id, position: list.cards.length })
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void handleDrop(list.id, list.cards.length)}
                />
              </div>

              <div className="creation-card">
                <div className="panel-header">
                  <div>
                    <span className="tiny-label">Novo card</span>
                    <strong>Entrar com uma tarefa nova</strong>
                  </div>
                  <span className="tiny-label">
                    {savingKey === `create-card:${list.id}` ? "Salvando..." : "Draft local"}
                  </span>
                </div>
                <div className="form-grid">
                  <input
                    className="kanban-input"
                    onChange={(event) =>
                      updateDraft(list.id, "title", event.target.value)
                    }
                    placeholder="Titulo"
                    value={draft.title}
                  />
                  <textarea
                    className="kanban-textarea"
                    onChange={(event) =>
                      updateDraft(list.id, "description", event.target.value)
                    }
                    placeholder="Descricao"
                    rows={3}
                    value={draft.description}
                  />
                  <input
                    className="kanban-input"
                    onChange={(event) =>
                      updateDraft(list.id, "assignee", event.target.value)
                    }
                    placeholder="Responsavel"
                    value={draft.assignee}
                  />
                  <button
                    className="ghost-button"
                    disabled={savingKey === `create-card:${list.id}`}
                    onClick={() => void handleCreateCard(list.id)}
                    type="button"
                  >
                    Criar card
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
