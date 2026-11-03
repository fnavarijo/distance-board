import { describe, expect, it } from "vitest";
import { keyForTop, planMove, sortActive, sortDone } from "./ordering";

const active = (id: string, order: string) => ({ id, order, completedAt: null });
const done = (id: string, order: string, millis: number) => ({
  id,
  order,
  completedAt: { toMillis: () => millis },
});
const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("sortActive", () => {
  it("orders active items by their order key", () => {
    const items = [active("x", "a2"), active("y", "a0"), active("z", "a1")];
    expect(ids(sortActive(items))).toEqual(["y", "z", "x"]);
  });

  it("breaks equal keys by document ID, whatever order they arrive in", () => {
    const one = [active("b", "a0"), active("a", "a0")];
    const other = [active("a", "a0"), active("b", "a0")];
    expect(ids(sortActive(one))).toEqual(["a", "b"]);
    expect(ids(sortActive(other))).toEqual(["a", "b"]);
  });

  it("compares keys by byte order, so uppercase sorts before lowercase", () => {
    const items = [active("x", "a0"), active("y", "Zz")];
    expect(ids(sortActive(items))).toEqual(["y", "x"]);
  });

  it("leaves out completed items", () => {
    const items = [active("x", "a1"), done("y", "a0", 100)];
    expect(ids(sortActive(items))).toEqual(["x"]);
  });
});

describe("sortDone", () => {
  it("puts the newest completion first and leaves out active items", () => {
    const items = [
      done("old", "a0", 100),
      active("open", "a1"),
      done("new", "a2", 200),
    ];
    expect(ids(sortDone(items))).toEqual(["new", "old"]);
  });

  it("breaks equal completion times by document ID", () => {
    const items = [done("b", "a0", 100), done("a", "a1", 100)];
    expect(ids(sortDone(items))).toEqual(["a", "b"]);
  });
});

describe("keyForTop", () => {
  it("gives a valid key for an empty list", () => {
    expect(keyForTop([])).toEqual(expect.any(String));
  });

  it("sorts a new item above every active item", () => {
    const items = [active("x", "a1"), active("y", "a0"), active("z", "a2")];
    const added = active("zzz-loses-ties", keyForTop(items));
    expect(ids(sortActive([...items, added]))[0]).toBe("zzz-loses-ties");
  });

  it("is not affected by a Done item's older, lower key", () => {
    const withoutDone = [active("x", "a5")];
    const withDone = [...withoutDone, done("y", "a0", 100)];
    expect(keyForTop(withDone)).toBe(keyForTop(withoutDone));
  });

  it("still sorts above the top when the top two keys are tied", () => {
    const items = [active("x", "a0"), active("y", "a0")];
    const added = active("zzz-loses-ties", keyForTop(items));
    expect(ids(sortActive([...items, added]))[0]).toBe("zzz-loses-ties");
  });
});

describe("planMove", () => {
  // Applies the planned writes the way Firestore would, then reads the list back.
  function afterMove(
    items: ReturnType<typeof active>[],
    id: string,
    toIndex: number,
  ) {
    const writes = planMove(items, id, toIndex);
    const moved = items.map((item) => {
      const write = writes.find((candidate) => candidate.id === item.id);
      return write ? { ...item, order: write.order } : item;
    });
    return { writes, order: ids(sortActive(moved)) };
  }

  const list = [active("a", "a0"), active("b", "a1"), active("c", "a2")];

  it("moves an item between two neighbours with one write", () => {
    const { writes, order } = afterMove(list, "c", 1);
    expect(order).toEqual(["a", "c", "b"]);
    expect(writes.map((write) => write.id)).toEqual(["c"]);
  });

  it("moves an item to the top", () => {
    expect(afterMove(list, "c", 0).order).toEqual(["c", "a", "b"]);
  });

  it("moves an item to the bottom", () => {
    expect(afterMove(list, "a", 2).order).toEqual(["b", "c", "a"]);
  });

  it("moves an item down between neighbours", () => {
    expect(afterMove(list, "a", 1).order).toEqual(["b", "a", "c"]);
  });

  it("plans no writes when the item stays where it is", () => {
    expect(afterMove(list, "b", 1).writes).toEqual([]);
  });

  it("plans no writes for an item that isn't in the active list", () => {
    expect(afterMove(list, "missing", 0).writes).toEqual([]);
  });

  it("doesn't throw when dropping between two items with the same key", () => {
    const tied = [active("a", "a0"), active("b", "a0"), active("c", "a1")];
    expect(afterMove(tied, "c", 1).order).toEqual(["a", "c", "b"]);
  });

  it("keeps the rest of a long tied run in place", () => {
    const tied = [
      active("a", "a0"),
      active("b", "a0"),
      active("c", "a0"),
      active("d", "a1"),
      active("e", "a2"),
    ];
    expect(afterMove(tied, "e", 2).order).toEqual(["a", "b", "e", "c", "d"]);
  });

  it("re-keys only inside the tie's neighbours", () => {
    const tied = [
      active("a", "a0"),
      active("b", "a1"),
      active("c", "a1"),
      active("d", "a2"),
      active("e", "a3"),
    ];
    const { writes, order } = afterMove(tied, "e", 2);
    expect(order).toEqual(["a", "b", "e", "c", "d"]);
    expect(writes.map((write) => write.id).sort()).toEqual(["b", "c", "e"]);
  });

  it("moves between neighbours when the moved item itself was tied", () => {
    const tied = [active("a", "a0"), active("b", "a0"), active("c", "a1")];
    expect(afterMove(tied, "a", 1).order).toEqual(["b", "a", "c"]);
  });

  it("ignores Done items when working out neighbours", () => {
    const mixed = [active("a", "a0"), done("old", "a0V", 100), active("b", "a1")];
    const writes = planMove(mixed, "b", 0);
    expect(writes.map((write) => write.id)).toEqual(["b"]);
    expect(writes[0].order < "a0").toBe(true);
  });

  it("lands every move correctly for every pattern of tied keys", () => {
    const itemIds = ["a", "b", "c", "d"];
    for (let pattern = 0; pattern < 8; pattern++) {
      // Each bit decides whether a key steps up from the previous one.
      let step = 0;
      const items = itemIds.map((id, index) => {
        if (index > 0 && pattern & (1 << (index - 1))) step++;
        return active(id, `a${step}`);
      });

      for (const id of itemIds) {
        for (let to = 0; to < itemIds.length; to++) {
          const expected = itemIds.filter((other) => other !== id);
          expected.splice(to, 0, id);
          expect(afterMove(items, id, to).order).toEqual(expected);
        }
      }
    }
  });
});
