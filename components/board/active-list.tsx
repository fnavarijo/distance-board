"use client";

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { ItemRow, type RowActions } from "@/components/board/item-row";
import { type Item, moveItem } from "@/lib/board-data";
import { getFirebase } from "@/lib/firebase";
import { sortActive } from "@/lib/ordering";

function SortableRow({ item, actions }: { item: Item; actions: RowActions }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-90" : undefined}
    >
      <ItemRow
        item={item}
        actions={actions}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            // touch-none lets a finger drag the handle without scrolling the page.
            className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${item.title}`}
          >
            <GripVertical aria-hidden="true" className="size-5" />
          </button>
        }
      />
    </li>
  );
}

// What's on screen during and just after a drag, so that incoming snapshots don't move
// the list under someone's finger.
type Frozen = { ids: string[]; dropped: readonly Item[] | null };

function applyFrozen(sorted: Item[], frozen: Frozen): Item[] {
  const byId = new Map(sorted.map((item) => [item.id, item]));
  const held = new Set(frozen.ids);
  return [
    ...sorted.filter((item) => !held.has(item.id)),
    ...frozen.ids.flatMap((id) => byId.get(id) ?? []),
  ];
}

export function ActiveList({ items, actions }: { items: Item[]; actions: RowActions }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [frozen, setFrozen] = useState<Frozen | null>(null);

  const sorted = sortActive(items);
  // Firestore's local snapshot arrives right after a drop, as a new items array. Once it
  // does, it's the truth, and there's no separate optimistic copy to reconcile (ITEM-5).
  const holding = frozen && (frozen.dropped === null || frozen.dropped === items);
  const visible = holding ? applyFrozen(sorted, frozen) : sorted;

  // The default announcements read out document IDs, so these use the titles instead.
  const titleOf = (id: UniqueIdentifier | undefined) =>
    visible.find((item) => item.id === id)?.title ?? "";
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} is over ${titleOf(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${titleOf(active.id)} at ${titleOf(over.id)}.`
        : `Dropped ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) => `Stopped moving ${titleOf(active.id)}.`,
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    const from = visible.findIndex((item) => item.id === active.id);
    const to = visible.findIndex((item) => item.id === over?.id);
    if (from === -1 || to === -1 || from === to) {
      setFrozen(null);
      return;
    }

    const ids = visible.map((item) => item.id);
    ids.splice(to, 0, ...ids.splice(from, 1));
    setFrozen({ ids, dropped: items });

    // Items may have changed during the drag, so aim for the same neighbour in the live list.
    const liveTo = sorted.findIndex((item) => item.id === over?.id);
    if (liveTo !== -1) {
      actions.run(
        moveItem(getFirebase().db, actions.boardId, items, String(active.id), liveTo),
      );
    }
  }

  return (
    <DndContext
      id="active-items"
      accessibility={{ announcements }}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => setFrozen({ ids: sorted.map((item) => item.id), dropped: null })}
      onDragEnd={onDragEnd}
      onDragCancel={() => setFrozen(null)}
    >
      <SortableContext items={visible.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-3">
          {visible.map((item) => (
            <SortableRow key={item.id} item={item} actions={actions} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
