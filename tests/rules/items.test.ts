import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addItem,
  addNote,
  completeItem,
  deleteItem,
  deleteNote,
  editItemTitle,
  moveItem,
  restoreItem,
} from "../../lib/board-data";
import { type Orderable, sortActive } from "../../lib/ordering";
import {
  type Account,
  type Accounts,
  expectDenied,
  pairedBoard,
  setUp,
  tearDown,
} from "./harness";

let accounts: Accounts;
let boardId: string;
let itemId: string;

beforeAll(async () => {
  accounts = await setUp();
  boardId = (await pairedBoard(accounts.alice, accounts.bob)).id;
});
afterAll(() => tearDown(accounts));

beforeEach(async () => {
  itemId = await addItem(accounts.alice.db, accounts.alice.actor, boardId, [], "First idea");
});

const itemDoc = (account: Account) =>
  doc(account.db, "boards", boardId, "items", itemId);

// A listener's first snapshot can come from the local cache, so this reads from the server.
async function serverItems(account: Account): Promise<Orderable[]> {
  const snapshot = await getDocs(collection(account.db, "boards", boardId, "items"));
  return snapshot.docs.map((item) => ({
    id: item.id,
    order: item.get("order"),
    completedAt: item.get("completedAt"),
  }));
}

async function readItem() {
  const snapshot = await getDoc(itemDoc(accounts.alice));
  return snapshot.data()!;
}

describe("creating an item", () => {
  const fields = () => ({
    title: "Idea",
    order: "a0",
    createdBy: accounts.alice.actor,
    createdAt: serverTimestamp(),
    completedBy: null,
    completedAt: null,
    notes: {},
  });
  const newDoc = () =>
    doc(collection(accounts.alice.db, "boards", boardId, "items"));

  it("allows a member's new item", async () => {
    await setDoc(newDoc(), fields());
  });

  it("rejects an item attributed to someone else", async () => {
    await expectDenied(
      setDoc(newDoc(), { ...fields(), createdBy: accounts.bob.actor }),
    );
  });

  it("rejects an item that starts with notes", async () => {
    const note = { text: "Hi", author: accounts.alice.actor, createdAt: serverTimestamp() };
    await expectDenied(setDoc(newDoc(), { ...fields(), notes: { n1: note } }));
  });

  it("rejects an item that starts completed", async () => {
    await expectDenied(
      setDoc(newDoc(), {
        ...fields(),
        completedBy: accounts.alice.actor,
        completedAt: serverTimestamp(),
      }),
    );
  });

  it("rejects extra fields", async () => {
    await expectDenied(setDoc(newDoc(), { ...fields(), category: "food" }));
  });

  it("rejects an empty or overlong title", async () => {
    await expectDenied(setDoc(newDoc(), { ...fields(), title: "" }));
    await expectDenied(setDoc(newDoc(), { ...fields(), title: "x".repeat(201) }));
  });

  it("rejects a non-member", async () => {
    const { carol } = accounts;
    const ref = doc(collection(carol.db, "boards", boardId, "items"));
    await expectDenied(setDoc(ref, { ...fields(), createdBy: carol.actor }));
  });
});

describe("non-members", () => {
  it("can't read, change or delete items", async () => {
    const { carol } = accounts;
    await expectDenied(getDoc(itemDoc(carol)));
    await expectDenied(getDocs(collection(carol.db, "boards", boardId, "items")));
    await expectDenied(updateDoc(itemDoc(carol), { title: "Mine now" }));
    await expectDenied(deleteDoc(itemDoc(carol)));
  });
});

describe("editing a title", () => {
  it("lets either member edit any item's title", async () => {
    await editItemTitle(accounts.bob.db, boardId, itemId, "Better idea");
    expect((await readItem()).title).toBe("Better idea");
  });

  it("rejects touching other fields at the same time", async () => {
    await expectDenied(updateDoc(itemDoc(accounts.bob), { title: "New", order: "a5" }));
  });

  it("rejects an overlong title", async () => {
    await expectDenied(updateDoc(itemDoc(accounts.bob), { title: "x".repeat(201) }));
  });
});

describe("reordering", () => {
  it("lets a member move an item, and both members then see the same order", async () => {
    const { alice, bob } = accounts;
    await addItem(alice.db, alice.actor, boardId, await serverItems(alice), "Another");
    const before = sortActive(await serverItems(alice));
    const last = before[before.length - 1].id;

    await moveItem(bob.db, boardId, await serverItems(bob), last, 0);

    expect(sortActive(await serverItems(alice))[0].id).toBe(last);
    expect(sortActive(await serverItems(bob))[0].id).toBe(last);
  });

  it("rejects touching other fields at the same time", async () => {
    await expectDenied(updateDoc(itemDoc(accounts.bob), { order: "a5", title: "Sneaky" }));
  });

  it("rejects reordering a completed item", async () => {
    const { alice } = accounts;
    await completeItem(alice.db, alice.actor, boardId, itemId);
    await expectDenied(updateDoc(itemDoc(alice), { order: "a5" }));
  });
});

describe("completing and restoring", () => {
  it("records who completed an item, and the other member can restore it", async () => {
    const { alice, bob } = accounts;
    await completeItem(bob.db, bob.actor, boardId, itemId);
    const completed = await readItem();
    expect(completed.completedBy.uid).toBe(bob.actor.uid);
    expect(completed.completedAt).not.toBeNull();

    await restoreItem(alice.db, boardId, [], itemId);
    const restored = await readItem();
    expect(restored.completedBy).toBeNull();
    expect(restored.completedAt).toBeNull();
  });

  it("rejects completing an item in someone else's name", async () => {
    await expectDenied(
      updateDoc(itemDoc(accounts.alice), {
        completedBy: accounts.bob.actor,
        completedAt: serverTimestamp(),
      }),
    );
  });

  it("rejects a completion that also touches the title", async () => {
    await expectDenied(
      updateDoc(itemDoc(accounts.alice), {
        completedBy: accounts.alice.actor,
        completedAt: serverTimestamp(),
        title: "Sneaky",
      }),
    );
  });

  it("rejects a restore that also touches the title", async () => {
    const { alice } = accounts;
    await completeItem(alice.db, alice.actor, boardId, itemId);
    await expectDenied(
      updateDoc(itemDoc(alice), {
        completedBy: null,
        completedAt: null,
        order: "a5",
        title: "Sneaky",
      }),
    );
  });
});

describe("deleting an item", () => {
  it("lets either member delete any item", async () => {
    await deleteItem(accounts.bob.db, boardId, itemId);
    expect((await getDoc(itemDoc(accounts.alice))).exists()).toBe(false);
  });
});

describe("notes", () => {
  const noteFields = (author = accounts.alice.actor, text = "I like it") => ({
    text,
    author,
    createdAt: serverTimestamp(),
  });

  it("lets a member add a note", async () => {
    const { alice } = accounts;
    const noteId = await addNote(alice.db, alice.actor, boardId, itemId, "I like it");
    const note = (await readItem()).notes[noteId];
    expect(note.text).toBe("I like it");
    expect(note.author.uid).toBe(alice.actor.uid);
  });

  it("keeps both notes when both members add one at the same moment", async () => {
    const { alice, bob } = accounts;
    await Promise.all([
      addNote(alice.db, alice.actor, boardId, itemId, "From Alice"),
      addNote(bob.db, bob.actor, boardId, itemId, "From Bob"),
    ]);
    expect(Object.keys((await readItem()).notes)).toHaveLength(2);
  });

  it("accepts 140 characters and rejects empty or longer text", async () => {
    const { alice } = accounts;
    await addNote(alice.db, alice.actor, boardId, itemId, "x".repeat(140));
    await expectDenied(addNote(alice.db, alice.actor, boardId, itemId, ""));
    await expectDenied(addNote(alice.db, alice.actor, boardId, itemId, "x".repeat(141)));
  });

  it("rejects a note attributed to someone else", async () => {
    const { alice, bob } = accounts;
    await expectDenied(addNote(alice.db, bob.actor, boardId, itemId, "Forged"));
  });

  it("rejects adding two notes in one write", async () => {
    await expectDenied(
      updateDoc(itemDoc(accounts.alice), {
        "notes.n1": noteFields(),
        "notes.n2": noteFields(),
      }),
    );
  });

  it("rejects a note write that also touches the title", async () => {
    await expectDenied(
      updateDoc(itemDoc(accounts.alice), { "notes.n1": noteFields(), title: "Sneaky" }),
    );
  });

  it("lets an author delete their own note", async () => {
    const { alice } = accounts;
    const noteId = await addNote(alice.db, alice.actor, boardId, itemId, "Oops");
    await deleteNote(alice.db, boardId, itemId, noteId);
    expect((await readItem()).notes[noteId]).toBeUndefined();
  });

  it("doesn't let a user delete someone else's note", async () => {
    const { alice, bob } = accounts;
    const noteId = await addNote(alice.db, alice.actor, boardId, itemId, "Mine");
    await expectDenied(deleteNote(bob.db, boardId, itemId, noteId));
  });

  it("doesn't let a user edit a note, even their own", async () => {
    const { alice } = accounts;
    const noteId = await addNote(alice.db, alice.actor, boardId, itemId, "Original");
    await expectDenied(
      updateDoc(itemDoc(alice), { [`notes.${noteId}.text`]: "Edited" }),
    );
  });

  it("rejects a write that adds my note and removes my partner's", async () => {
    const { alice, bob } = accounts;
    const partnerNote = await addNote(alice.db, alice.actor, boardId, itemId, "Theirs");
    await expectDenied(
      updateDoc(itemDoc(bob), {
        "notes.mine": noteFields(bob.actor),
        [`notes.${partnerNote}`]: deleteField(),
      }),
    );
  });

  it("rejects replacing a note's author by rewriting it", async () => {
    const { alice, bob } = accounts;
    const noteId = await addNote(alice.db, alice.actor, boardId, itemId, "Mine");
    await expectDenied(
      updateDoc(itemDoc(bob), { [`notes.${noteId}`]: noteFields(bob.actor, "Forged") }),
    );
  });
});
