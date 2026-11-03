"use client";

import { Check, ChevronDown, MessageCircle, X } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { useUser } from "@/components/auth-provider";
import { Avatar } from "@/components/avatar";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addNote,
  deleteItem,
  deleteNote,
  editItemTitle,
  type Item,
  LIMITS,
  type Note,
} from "@/lib/board-data";
import { getFirebase } from "@/lib/firebase";

export type RowActions = {
  boardId: string;
  // Runs a write and shows a gentle message if it fails.
  run: (write: Promise<unknown>) => void;
  onToggleDone: (item: Item, origin: HTMLElement) => void;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

function NoteRow({
  note,
  itemId,
  actions,
}: {
  note: Note;
  itemId: string;
  actions: RowActions;
}) {
  const user = useUser();
  return (
    <li className="flex items-start gap-2">
      <Avatar person={note.author} />
      <div className="min-w-0 flex-1">
        <p className="break-words">{note.text}</p>
        <p className="text-xs text-muted-foreground">
          {note.author.name}, {formatDate(note.createdAt.toDate())}
        </p>
      </div>
      {note.author.uid === user.uid && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete note: ${note.text}`}
          onClick={() =>
            actions.run(deleteNote(getFirebase().db, actions.boardId, itemId, note.id))
          }
        >
          <X />
        </Button>
      )}
    </li>
  );
}

function ItemDetails({ item, actions }: { item: Item; actions: RowActions }) {
  const user = useUser();
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const { boardId, run } = actions;

  function submitNote(event: FormEvent) {
    event.preventDefault();
    const text = note.trim();
    if (!text) return;
    setNote("");
    run(addNote(getFirebase().db, user, boardId, item.id, text));
  }

  function submitTitle(event: FormEvent) {
    event.preventDefault();
    const next = title.trim();
    if (!next) return;
    setEditing(false);
    if (next !== item.title) run(editItemTitle(getFirebase().db, boardId, item.id, next));
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {item.notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {item.notes.map((entry) => (
            <NoteRow key={entry.id} note={entry} itemId={item.id} actions={actions} />
          ))}
        </ul>
      )}
      <form onSubmit={submitNote} className="flex gap-2">
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={LIMITS.note}
          placeholder="Add a short note"
          aria-label={`Add a note to ${item.title}`}
        />
        <Button type="submit" variant="secondary" disabled={!note.trim()}>
          Add note
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Added by {item.createdBy.name}, {formatDate(item.createdAt.toDate())}
      </p>
      {editing ? (
        <form onSubmit={submitTitle} className="flex flex-col gap-2">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={LIMITS.itemTitle}
            aria-label="Item title"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!title.trim()}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setTitle(item.title);
              setEditing(true);
            }}
          >
            Edit title
          </Button>
          <ConfirmButton
            size="sm"
            variant="ghost"
            label="Delete"
            title="Delete this idea?"
            description={`"${item.title}" and its notes will be gone for both of you.`}
            confirmLabel="Delete"
            onConfirm={() => run(deleteItem(getFirebase().db, boardId, item.id))}
          />
        </div>
      )}
    </div>
  );
}

export function ItemRow({
  item,
  actions,
  handle,
}: {
  item: Item;
  actions: RowActions;
  handle?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = item.completedBy !== null;

  return (
    <div className="rounded-2xl bg-card shadow-soft">
      <div className="flex items-center gap-1 p-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Restore ${item.title}` : `Complete ${item.title}`}
          onClick={(event) => actions.onToggleDone(item, event.currentTarget)}
          className="springy flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            className={`flex size-6 items-center justify-center rounded-full border-2 ${
              done ? "border-primary bg-primary text-primary-foreground" : "border-input"
            }`}
          >
            {done && <Check className="size-4" strokeWidth={3} />}
          </span>
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`${item.title}, show details`}
          onClick={() => setExpanded((open) => !open)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            className={`min-w-0 flex-1 font-semibold break-words ${
              done ? "text-muted-foreground line-through" : ""
            }`}
          >
            {item.title}
          </span>
          {!expanded && item.notes.length > 0 && (
            <span
              data-testid="note-count"
              className="flex shrink-0 items-center gap-1 text-sm font-bold text-muted-foreground"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              {item.notes.length}
              <span className="sr-only">{item.notes.length === 1 ? "note" : "notes"}</span>
            </span>
          )}
          <Avatar person={item.createdBy} />
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
        {handle}
      </div>
      {done && item.completedBy && item.completedAt && (
        <p className="flex items-center gap-2 px-4 pb-3 text-sm text-muted-foreground">
          <Avatar person={item.completedBy} />
          Done by {item.completedBy.name}, {formatDate(item.completedAt.toDate())}
        </p>
      )}
      {expanded && <ItemDetails item={item} actions={actions} />}
    </div>
  );
}
