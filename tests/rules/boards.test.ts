import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addItem,
  createBoard,
  generateInvite,
  getInvite,
  leaveBoard,
  listMyBoards,
} from "../../lib/board-data";
import {
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

describe("creating boards", () => {
  it("lets a user create a board with themselves as the only member", async () => {
    const { alice } = accounts;
    const { id } = await soloBoard(alice);
    const mine = await listMyBoards(alice.db, alice.actor.uid);
    expect(mine.find((board) => board.id === id)?.members).toEqual([alice.actor.uid]);
  });

  it("rejects a board created with someone else as a member", async () => {
    const { alice, bob } = accounts;
    const fields = {
      name: "Sneaky",
      currentInviteId: null,
      createdBy: alice.actor.uid,
      createdAt: serverTimestamp(),
    };
    await expectDenied(
      setDoc(doc(collection(alice.db, "boards")), {
        ...fields,
        members: [alice.actor.uid, bob.actor.uid],
      }),
    );
    await expectDenied(
      setDoc(doc(collection(alice.db, "boards")), {
        ...fields,
        members: [bob.actor.uid],
      }),
    );
  });

  it("rejects an empty or overlong board name", async () => {
    const { alice } = accounts;
    await expectDenied(createBoard(alice.db, alice.actor, ""));
    await expectDenied(createBoard(alice.db, alice.actor, "x".repeat(61)));
  });
});

describe("reading boards", () => {
  it("lets only members read a board or its items", async () => {
    const { alice, carol } = accounts;
    const { id } = await soloBoard(alice);
    expect((await getDoc(doc(alice.db, "boards", id))).exists()).toBe(true);
    await expectDenied(getDoc(doc(carol.db, "boards", id)));
    await expectDenied(getDocs(collection(carol.db, "boards", id, "items")));
  });

  it("allows only the query for your own boards", async () => {
    const { alice } = accounts;
    await expectDenied(getDocs(collection(alice.db, "boards")));
    await expectDenied(
      getDocs(
        query(
          collection(alice.db, "boards"),
          where("members", "array-contains", accounts.bob.actor.uid),
        ),
      ),
    );
  });
});

describe("changing board membership", () => {
  it("doesn't let a member add another user to a board", async () => {
    const { alice, carol } = accounts;
    const { id } = await soloBoard(alice);
    await expectDenied(
      updateDoc(doc(alice.db, "boards", id), { members: arrayUnion(carol.actor.uid) }),
    );
  });

  it("doesn't let an outsider add themselves without an invite", async () => {
    const { alice, carol } = accounts;
    const { id } = await soloBoard(alice);
    await expectDenied(
      updateDoc(doc(carol.db, "boards", id), { members: arrayUnion(carol.actor.uid) }),
    );
  });

  it("doesn't let a member remove the other member", async () => {
    const { alice, bob } = accounts;
    const { id } = await pairedBoard(alice, bob);
    await expectDenied(
      updateDoc(doc(alice.db, "boards", id), { members: arrayRemove(bob.actor.uid) }),
    );
  });

  it("doesn't let a member change other fields while leaving", async () => {
    const { alice, bob } = accounts;
    const { id } = await pairedBoard(alice, bob);
    await expectDenied(
      updateDoc(doc(bob.db, "boards", id), {
        members: arrayRemove(bob.actor.uid),
        name: "Renamed",
      }),
    );
  });

  it("doesn't let a sole member empty a board without deleting it", async () => {
    const { alice } = accounts;
    const { id } = await soloBoard(alice);
    await expectDenied(
      updateDoc(doc(alice.db, "boards", id), { members: arrayRemove(alice.actor.uid) }),
    );
  });
});

describe("leaving", () => {
  it("keeps the board for the remaining member, who can invite someone new", async () => {
    const { alice, bob } = accounts;
    const { id, name, inviteId } = await pairedBoard(alice, bob);
    await leaveBoard(bob.db, bob.actor, id);

    await expectDenied(getDoc(doc(bob.db, "boards", id)));
    const newInvite = await generateInvite(
      alice.db,
      alice.actor,
      boardOf(id, name, inviteId),
    );
    expect(await getInvite(alice.db, inviteId)).toBeNull();
    expect((await getInvite(alice.db, newInvite))?.usedBy).toBeNull();
  });

  it("deletes the board, its items and its invite when the last member leaves", async () => {
    const { alice } = accounts;
    const { id, name } = await soloBoard(alice);
    const inviteId = await generateInvite(alice.db, alice.actor, boardOf(id, name, null));
    // More than one delete batch's worth of items.
    for (let index = 0; index < 12; index++) {
      await addItem(alice.db, alice.actor, id, [], `Item ${index}`);
    }

    await leaveBoard(alice.db, alice.actor, id);

    const mine = await listMyBoards(alice.db, alice.actor.uid);
    expect(mine.some((board) => board.id === id)).toBe(false);
    expect(await getInvite(alice.db, inviteId)).toBeNull();
  });

  it("can finish a delete that was interrupted after the invite was removed", async () => {
    const { alice } = accounts;
    const { id, name } = await soloBoard(alice);
    const inviteId = await generateInvite(alice.db, alice.actor, boardOf(id, name, null));
    await deleteDoc(doc(alice.db, "invites", inviteId));

    await leaveBoard(alice.db, alice.actor, id);

    const mine = await listMyBoards(alice.db, alice.actor.uid);
    expect(mine.some((board) => board.id === id)).toBe(false);
  });

  it("doesn't let a board with two members be deleted", async () => {
    const { alice, bob } = accounts;
    const { id } = await pairedBoard(alice, bob);
    await expectDenied(deleteDoc(doc(alice.db, "boards", id)));
  });
});
