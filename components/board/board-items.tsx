"use client";

import { ChevronDown } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useUser } from "@/components/auth-provider";
import { ActiveList } from "@/components/board/active-list";
import { Celebration } from "@/components/board/celebration";
import { ItemRow, type RowActions } from "@/components/board/item-row";
import { EmptyListArt } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  addItem,
  completeItem,
  type Item,
  LIMITS,
  restoreItem,
  subscribeToItems,
} from "@/lib/board-data";
import { getFirebase } from "@/lib/firebase";
import { sortActive, sortDone } from "@/lib/ordering";

export function BoardItems({ boardId }: { boardId: string }) {
  const user = useUser();
  const [items, setItems] = useState<Item[] | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ key: number; x: number; y: number } | null>(null);

  // Lives in an effect inside the board route, so it detaches when the route is hidden (COST-6).
  useEffect(
    () =>
      subscribeToItems(getFirebase().db, boardId, setItems, () =>
        setMessage("We lost touch with this board. Reload the page to reconnect."),
      ),
    [boardId],
  );

  function run(write: Promise<unknown>) {
    setMessage(null);
    write.catch(() =>
      setMessage("That change didn't save. Check your connection and try again."),
    );
  }

  const all = items ?? [];

  const actions: RowActions = {
    boardId,
    run,
    onToggleDone(item, origin) {
      const { db } = getFirebase();
      if (item.completedBy) {
        run(restoreItem(db, boardId, all, item.id));
        return;
      }
      const box = origin.getBoundingClientRect();
      setBurst({
        key: Date.now(),
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
      });
      run(completeItem(db, user, boardId, item.id));
    },
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = title.trim();
    // Before the first snapshot the top of the list isn't known (ITEM-3).
    if (!next || items === null) return;
    setTitle("");
    run(addItem(getFirebase().db, user, boardId, all, next));
  }

  const active = sortActive(all);
  const done = sortDone(all);

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={LIMITS.itemTitle}
          placeholder="What should you two do?"
          aria-label="New idea"
        />
        <Button type="submit" disabled={!title.trim() || items === null}>
          Add
        </Button>
      </form>

      {message && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {message}
        </p>
      )}

      {items !== null && active.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <EmptyListArt className="w-52" />
          <p className="text-lg text-pretty text-muted-foreground">
            Nothing here yet, what should you two do first?
          </p>
        </div>
      )}

      {active.length > 0 && <ActiveList items={all} actions={actions} />}

      {done.length > 0 && (
        <Collapsible className="flex flex-col gap-3">
          <CollapsibleTrigger className="group flex min-h-11 items-center gap-2 self-start rounded-full px-3 font-extrabold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Done ({done.length})
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-data-[panel-open]:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="flex flex-col gap-3">
              {done.map((item) => (
                <li key={item.id}>
                  <ItemRow item={item} actions={actions} />
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {burst && (
        <Celebration key={burst.key} x={burst.x} y={burst.y} onDone={() => setBurst(null)} />
      )}
    </div>
  );
}
