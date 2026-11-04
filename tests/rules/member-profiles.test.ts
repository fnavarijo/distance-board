import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  generateInvite,
  joinBoard,
  leaveBoard,
  listMyBoards,
  otherMember,
  syncMyProfile,
} from "../../lib/board-data";
import {
  type Account,
  type Accounts,
  boardOf,
  expectDenied,
  pairedBoard,
  setUp,
  soloBoard,
  tearDown,
} from "./harness";

let accounts: Accounts;
beforeAll(async () => {
  accounts = await setUp();
});
afterAll(() => tearDown(accounts));

async function myBoard(account: Account, id: string) {
  const boards = await listMyBoards(account.db, account.actor.uid);
  return boards.find((board) => board.id === id)!;
}

// What the app wrote before memberProfiles existed. Old tabs can still write these.
async function oldBoard(owner: Account) {
  const ref = doc(collection(owner.db, "boards"));
  await setDoc(ref, {
    name: "Old board",
    members: [owner.actor.uid],
    currentInviteId: null,
    createdBy: owner.actor.uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, name: "Old board" };
}

async function oldJoin(joiner: Account, inviteId: string, boardId: string) {
  const batch = writeBatch(joiner.db);
  batch.update(doc(joiner.db, "invites", inviteId), { usedBy: joiner.actor.uid });
  batch.update(doc(joiner.db, "boards", boardId), { members: arrayUnion(joiner.actor.uid) });
  await batch.commit();
}

async function oldPairedBoard(owner: Account, partner: Account) {
  const { id, name } = await oldBoard(owner);
  const inviteId = await generateInvite(owner.db, owner.actor, boardOf(id, name, null));
  await oldJoin(partner, inviteId, id);
  return { id, name, inviteId };
}

describe("creating a board", () => {
  it("stores the creator's entry, and the board is waiting for someone", async () => {
    const { alice } = accounts;
    const { id } = await soloBoard(alice);
    const board = await myBoard(alice, id);
    expect(board.memberProfiles).toEqual({
      [alice.actor.uid]: { name: "Test alice", photoURL: null },
    });
    expect(otherMember(board, alice.actor.uid)).toEqual({ status: "waiting" });
  });
});

describe("joining", () => {
  it("adds the joiner's entry and keeps the creator's, so each sees the other", async () => {
    const { alice, bob } = accounts;
    const { id } = await pairedBoard(alice, bob);

    expect(otherMember(await myBoard(alice, id), alice.actor.uid)).toEqual({
      status: "partner",
      person: { uid: bob.actor.uid, name: "Test bob", photoURL: null },
    });
    expect(otherMember(await myBoard(bob, id), bob.actor.uid)).toEqual({
      status: "partner",
      person: { uid: alice.actor.uid, name: "Test alice", photoURL: null },
    });
  });

  it("replaces an entry left behind by someone who left through an old tab", async () => {
    const { alice, bob } = accounts;
    const { id, name, inviteId } = await pairedBoard(alice, bob);

    await updateDoc(doc(bob.db, "boards", id), { members: arrayRemove(bob.actor.uid) });
    const board = await myBoard(alice, id);
    expect(board.memberProfiles[bob.actor.uid]).toBeDefined();
    expect(otherMember(board, alice.actor.uid)).toEqual({ status: "waiting" });

    const newInvite = await generateInvite(alice.db, alice.actor, boardOf(id, name, inviteId));
    const renamed = { ...bob.actor, name: "New name" };
    await joinBoard(bob.db, renamed, { id: newInvite, boardId: id });

    expect(otherMember(await myBoard(alice, id), alice.actor.uid)).toEqual({
      status: "partner",
      person: renamed,
    });
  });
});

describe("leaving", () => {
  it("removes the leaver's entry and keeps the other person's", async () => {
    const { alice, bob } = accounts;
    const { id } = await pairedBoard(alice, bob);

    await leaveBoard(bob.db, bob.actor, id);

    const board = await myBoard(alice, id);
    expect(Object.keys(board.memberProfiles)).toEqual([alice.actor.uid]);
    expect(otherMember(board, alice.actor.uid)).toEqual({ status: "waiting" });
  });
});

describe("syncing your details", () => {
  it("fills in a missing entry, which then reaches the partner's label", async () => {
    const { alice, bob } = accounts;
    const { id } = await oldPairedBoard(alice, bob);
    expect(otherMember(await myBoard(alice, id), alice.actor.uid)).toEqual({ status: "unknown" });

    expect(await syncMyProfile(bob.db, bob.actor, [await myBoard(bob, id)])).toBe(1);

    expect(otherMember(await myBoard(alice, id), alice.actor.uid)).toEqual({
      status: "partner",
      person: bob.actor,
    });
  });

  it("updates a changed name or photo", async () => {
    const { alice, bob } = accounts;
    const { id } = await pairedBoard(alice, bob);
    const renamed = { ...bob.actor, name: "New name" };
    const rephotographed = { ...renamed, photoURL: "https://example.com/new.png" };

    expect(await syncMyProfile(bob.db, renamed, [await myBoard(bob, id)])).toBe(1);
    expect(await syncMyProfile(bob.db, rephotographed, [await myBoard(bob, id)])).toBe(1);

    expect(otherMember(await myBoard(alice, id), alice.actor.uid)).toEqual({
      status: "partner",
      person: rephotographed,
    });
  });

  it("writes nothing when the entry is already correct", async () => {
    const { alice } = accounts;
    const { id } = await soloBoard(alice);
    expect(await syncMyProfile(alice.db, alice.actor, [await myBoard(alice, id)])).toBe(0);
  });

  it("carries on past a board it can't write to, without throwing", async () => {
    const { alice, carol } = accounts;
    const { id: othersBoard } = await soloBoard(alice);
    const { id: mine } = await oldBoard(carol);
    const boards = [await myBoard(alice, othersBoard), await myBoard(carol, mine)];

    expect(await syncMyProfile(carol.db, carol.actor, boards)).toBe(1);

    expect((await myBoard(carol, mine)).memberProfiles[carol.actor.uid]).toBeDefined();
  });
});

describe("writes from the app before this field existed", () => {
  it("can still create a board with no map", async () => {
    const { alice } = accounts;
    const { id } = await oldBoard(alice);
    const board = await myBoard(alice, id);
    expect(board.memberProfiles).toEqual({});
    expect(otherMember(board, alice.actor.uid)).toEqual({ status: "waiting" });
  });

  it("can still join without adding an entry", async () => {
    const { alice, bob } = accounts;
    const { id } = await soloBoard(alice);
    const inviteId = await generateInvite(alice.db, alice.actor, boardOf(id, "Test board", null));
    await oldJoin(bob, inviteId, id);
    expect(otherMember(await myBoard(alice, id), alice.actor.uid)).toEqual({ status: "unknown" });
  });

  it("can still leave without removing an entry", async () => {
    const { alice, bob } = accounts;
    const { id } = await pairedBoard(alice, bob);
    await updateDoc(doc(bob.db, "boards", id), { members: arrayRemove(bob.actor.uid) });
    expect((await myBoard(alice, id)).members).toEqual([alice.actor.uid]);
  });
});

describe("boards with no map", () => {
  it("can be joined by the new app", async () => {
    const { alice, bob } = accounts;
    const { id, name } = await oldBoard(alice);
    const inviteId = await generateInvite(alice.db, alice.actor, boardOf(id, name, null));
    await joinBoard(bob.db, bob.actor, { id: inviteId, boardId: id });
    expect(otherMember(await myBoard(alice, id), alice.actor.uid)).toEqual({
      status: "partner",
      person: bob.actor,
    });
  });

  it("can be left by the new app", async () => {
    const { alice, bob } = accounts;
    const { id } = await oldPairedBoard(alice, bob);
    await leaveBoard(bob.db, bob.actor, id);
    const board = await myBoard(alice, id);
    expect(board.members).toEqual([alice.actor.uid]);
    expect(board.memberProfiles).toEqual({});
  });
});

describe("forbidden writes", () => {
  const entry = { name: "Someone else", photoURL: null };

  function newBoardFields(owner: Account) {
    return {
      name: "Sneaky",
      members: [owner.actor.uid],
      currentInviteId: null,
      createdBy: owner.actor.uid,
      createdAt: serverTimestamp(),
    };
  }

  it("rejects creating a board with someone else's entry, or with two entries", async () => {
    const { alice, bob } = accounts;
    const ref = () => doc(collection(alice.db, "boards"));
    await expectDenied(
      setDoc(ref(), { ...newBoardFields(alice), memberProfiles: { [bob.actor.uid]: entry } }),
    );
    await expectDenied(
      setDoc(ref(), {
        ...newBoardFields(alice),
        memberProfiles: { [alice.actor.uid]: entry, [bob.actor.uid]: entry },
      }),
    );
  });

  it("doesn't let a member add, change or remove their partner's entry", async () => {
    const { alice, bob, carol } = accounts;
    const { id } = await pairedBoard(alice, bob);
    const board = doc(alice.db, "boards", id);
    await expectDenied(updateDoc(board, { [`memberProfiles.${carol.actor.uid}`]: entry }));
    await expectDenied(updateDoc(board, { [`memberProfiles.${bob.actor.uid}`]: entry }));
    await expectDenied(updateDoc(board, { [`memberProfiles.${bob.actor.uid}`]: deleteField() }));
  });

  it("doesn't let an outsider add an entry", async () => {
    const { alice, carol } = accounts;
    const { id } = await soloBoard(alice);
    await expectDenied(
      updateDoc(doc(carol.db, "boards", id), { [`memberProfiles.${carol.actor.uid}`]: entry }),
    );
  });

  it("doesn't let a joiner write someone else's entry", async () => {
    const { alice, bob, carol } = accounts;
    const { id } = await oldBoard(alice);
    const inviteId = await generateInvite(alice.db, alice.actor, boardOf(id, "Old board", null));
    const batch = writeBatch(bob.db);
    batch.update(doc(bob.db, "invites", inviteId), { usedBy: bob.actor.uid });
    batch.update(doc(bob.db, "boards", id), {
      members: arrayUnion(bob.actor.uid),
      [`memberProfiles.${carol.actor.uid}`]: entry,
    });
    await expectDenied(batch.commit());
  });

  it("rejects a malformed entry when creating a board", async () => {
    const { alice } = accounts;
    const own = alice.actor.uid;
    const create = (profile: unknown) =>
      setDoc(doc(collection(alice.db, "boards")), {
        ...newBoardFields(alice),
        memberProfiles: { [own]: profile },
      });
    await expectDenied(create({ ...entry, extra: true }));
    await expectDenied(create({ name: "No photo field" }));
    await expectDenied(create({ name: "x".repeat(201), photoURL: null }));
  });

  it("rejects a malformed entry when joining", async () => {
    const { alice, bob } = accounts;
    const { id } = await oldBoard(alice);
    const inviteId = await generateInvite(alice.db, alice.actor, boardOf(id, "Old board", null));
    const join = (profile: unknown) => {
      const batch = writeBatch(bob.db);
      batch.update(doc(bob.db, "invites", inviteId), { usedBy: bob.actor.uid });
      batch.update(doc(bob.db, "boards", id), {
        members: arrayUnion(bob.actor.uid),
        [`memberProfiles.${bob.actor.uid}`]: profile,
      });
      return batch.commit();
    };
    await expectDenied(join({ ...entry, extra: true }));
    await expectDenied(join({ name: "No photo field" }));
    await expectDenied(join({ name: "x".repeat(201), photoURL: null }));
  });

  it("doesn't let a leaver change the partner's entry or keep rewriting their own", async () => {
    const { alice, bob } = accounts;
    const { id } = await pairedBoard(alice, bob);
    const board = doc(bob.db, "boards", id);
    await expectDenied(
      updateDoc(board, {
        members: arrayRemove(bob.actor.uid),
        [`memberProfiles.${alice.actor.uid}`]: deleteField(),
      }),
    );
    await expectDenied(
      updateDoc(board, {
        members: arrayRemove(bob.actor.uid),
        [`memberProfiles.${bob.actor.uid}`]: entry,
      }),
    );
  });

  it("doesn't let an entry update change any other board field", async () => {
    const { alice } = accounts;
    const { id } = await soloBoard(alice);
    await expectDenied(
      updateDoc(doc(alice.db, "boards", id), {
        [`memberProfiles.${alice.actor.uid}`]: entry,
        name: "Renamed",
      }),
    );
  });

  it("doesn't let a member remove their own entry while staying on the board", async () => {
    const { alice } = accounts;
    const { id } = await soloBoard(alice);
    await expectDenied(
      updateDoc(doc(alice.db, "boards", id), {
        [`memberProfiles.${alice.actor.uid}`]: deleteField(),
      }),
    );
  });

  it("rejects an entry with extra fields, a missing field, wrong types or a long name", async () => {
    const { alice } = accounts;
    const { id } = await soloBoard(alice);
    const board = doc(alice.db, "boards", id);
    const own = `memberProfiles.${alice.actor.uid}`;
    await expectDenied(updateDoc(board, { [own]: { ...entry, extra: true } }));
    await expectDenied(updateDoc(board, { [own]: { name: "No photo field" } }));
    await expectDenied(updateDoc(board, { [own]: { name: 7, photoURL: null } }));
    await expectDenied(updateDoc(board, { [own]: { name: "Bad photo", photoURL: 7 } }));
    await expectDenied(updateDoc(board, { [own]: { name: "x".repeat(201), photoURL: null } }));
    await expectDenied(updateDoc(board, { [own]: "not a map" }));
    await expectDenied(updateDoc(board, { memberProfiles: "not a map" }));
  });
});
