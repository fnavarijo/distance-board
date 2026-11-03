import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

export type Orderable = {
  id: string;
  order: string;
  completedAt: { toMillis(): number } | null;
};

// Keys and IDs are compared by code unit, the ordering fractional-indexing relies on.
// localeCompare would disagree: it sorts "a0" before "Zz".
export type OrderWrite = { id: string; order: string };

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

export function sortActive<T extends Orderable>(items: readonly T[]): T[] {
  return items
    .filter((item) => item.completedAt === null)
    .sort(
      (a, b) => compareStrings(a.order, b.order) || compareStrings(a.id, b.id),
    );
}

export function sortDone<T extends Orderable>(items: readonly T[]): T[] {
  const completedMillis = (item: T) => item.completedAt?.toMillis() ?? 0;
  return items
    .filter((item) => item.completedAt !== null)
    .sort(
      (a, b) =>
        completedMillis(b) - completedMillis(a) || compareStrings(a.id, b.id),
    );
}

export function keyForTop(items: readonly Orderable[]): string {
  const [top] = sortActive(items);
  return generateKeyBetween(null, top?.order ?? null);
}

// Plans the writes that put an active item at `toIndex` in the sorted active list.
// This is usually one write. generateKeyBetween throws when its bounds are equal,
// so dropping between two tied items re-keys the whole tied run around the moved item.
export function planMove(
  items: readonly Orderable[],
  id: string,
  toIndex: number,
): OrderWrite[] {
  const sorted = sortActive(items);
  const from = sorted.findIndex((item) => item.id === id);
  if (from === -1) return [];

  const rest = sorted.filter((item) => item.id !== id);
  const to = Math.min(Math.max(toIndex, 0), rest.length);
  if (from === to) return [];

  const before = rest[to - 1]?.order ?? null;
  const after = rest[to]?.order ?? null;
  if (before === null || before !== after) {
    return [{ id, order: generateKeyBetween(before, after) }];
  }

  let start = to - 1;
  while (rest[start - 1]?.order === before) start--;
  let end = to;
  while (rest[end + 1]?.order === before) end++;

  const run = [
    ...rest.slice(start, to).map((item) => item.id),
    id,
    ...rest.slice(to, end + 1).map((item) => item.id),
  ];
  const keys = generateNKeysBetween(
    rest[start - 1]?.order ?? null,
    rest[end + 1]?.order ?? null,
    run.length,
  );
  return run.map((runId, index) => ({ id: runId, order: keys[index] }));
}
