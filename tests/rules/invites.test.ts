import {
  collection,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  generateInvite,
  getInvite,
  joinBoard,
  leaveBoard,
  resolveInvite,
} from "../../lib/board-data";
import {
  type Accounts,
  boardOf,
  expectDenied,
  inviteExpiringAt,
  pairedBoard,
  setUp,
  soloBoard,
  tearDown,
} from "./harness";

const DAY_MS = 24 * 60 * 60 * 1000;

let accounts: Accounts;
beforeAll(async () => {
  accounts = await setUp();
});
afterAll(() => tearDown(accounts));

async function boardWithInvite() {
  const { alice } = accounts;
  const { id, name } = await soloBoard(alice);
  const inviteId = await generateInvite(alice.db, alice.actor, boardOf(id, name, null));
  return { id, name, inviteId };
}

describe("reading invites", () => {
  it("lets any allowed account read an invite by its ID", async () => {
    const { carol } = accounts;
    const { name, inviteId } = await boardWithInvite();
    const invite = await getInvite(carol.db, inviteId);
    expect(invite?.boardName).toBe(name);
    expect(invite?.inviterName).toBe(accounts.alice.actor.name);
  });

  it("doesn't let anyone list invites", async () => {
    await expectDenied(getDocs(collection(accounts.carol.db, "invites")));
  });
});

describe("resolveInvite", () => {
  it("says a missing invite is gone, not denied", async () => {
    const { carol } = accounts;
    expect(await resolveInvite(carol.db, carol.actor.uid, "no-such-invite")).toEqual({
      state: "gone",
    });
  });

  it("offers a valid invite to a non-member", async () => {
    const { bob } = accounts;
    const { inviteId } = await boardWithInvite();
    const result = await resolveInvite(bob.db, bob.actor.uid, inviteId);
    expect(result.state).toBe("joinable");
  });

  it("sends a current member to the board, even when the link is used", async () => {
    const { alice, bob } = accounts;
    const { id, inviteId } = await pairedBoard(alice, bob);
    expect(await resolveInvite(alice.db, alice.actor.uid, inviteId)).toEqual({
      state: "member",
      boardId: id,
    });
    expect(await resolveInvite(bob.db, bob.actor.uid, inviteId)).toEqual({
      state: "member",
      boardId: id,
    });
  });

  it("says a used link's board is full", async () => {
    const { alice, bob, carol } = accounts;
    const { inviteId } = await pairedBoard(alice, bob);
    expect(await resolveInvite(carol.db, carol.actor.uid, inviteId)).toEqual({
      state: "full",
    });
  });

  it("says an old link has expired", async () => {
    const { alice, bob } = accounts;
    const { id, name } = await soloBoard(alice);
    const inviteId = await inviteExpiringAt(
      alice,
      id,
      name,
      Timestamp.fromMillis(Date.now() - DAY_MS),
    );
    expect(await resolveInvite(bob.db, bob.actor.uid, inviteId)).toEqual({
      state: "expired",
    });
  });

  it("says a replaced link is gone", async () => {
    const { alice, bob } = accounts;
    const { id, name, inviteId } = await boardWithInvite();
    await generateInvite(alice.db, alice.actor, boardOf(id, name, inviteId));
    expect(await resolveInvite(bob.db, bob.actor.uid, inviteId)).toEqual({
      state: "gone",
    });
  });
});

describe("creating invites", () => {
  it("doesn't let a non-member create an invite for a board", async () => {
    const { alice, carol } = accounts;
    const { id, name } = await soloBoard(alice);
    await expectDenied(
      generateInvite(carol.db, carol.actor, boardOf(id, name, null)),
    );
  });

  it("doesn't let a board with two members create an invite", async () => {
    const { alice, bob } = accounts;
    const { id, name, inviteId } = await pairedBoard(alice, bob);
    await expectDenied(
      generateInvite(alice.db, alice.actor, boardOf(id, name, inviteId)),
    );
  });

  it("rejects an invite that lasts longer than 7 days", async () => {
    const { alice } = accounts;
    const { id, name } = await soloBoard(alice);
    await expectDenied(
      inviteExpiringAt(alice, id, name, Timestamp.fromMillis(Date.now() + 8 * DAY_MS)),
    );
  });

  it("rejects an invite created outside the batch that makes it current", async () => {
    const { alice } = accounts;
    const { id, name } = await soloBoard(alice);
    const batch = writeBatch(alice.db);
    batch.set(doc(collection(alice.db, "invites")), {
      boardId: id,
      boardName: name,
      inviterName: alice.actor.name,
      createdBy: alice.actor.uid,
      expiresAt: Timestamp.fromMillis(Date.now() + DAY_MS),
      usedBy: null,
    });
    await expectDenied(batch.commit());
  });

  it("lets a remaining member replace an invite made by someone who left", async () => {
    const { alice, bob } = accounts;
    const { id, name, inviteId } = await pairedBoard(alice, bob);
    await leaveBoard(alice.db, alice.actor, id);

    const newInvite = await generateInvite(bob.db, bob.actor, boardOf(id, name, inviteId));

    expect(await getInvite(bob.db, inviteId)).toBeNull();
    expect((await getInvite(bob.db, newInvite))?.boardId).toBe(id);
  });
});

describe("joining", () => {
  it("adds the caller to the board and marks the invite as used", async () => {
    const { alice, bob } = accounts;
    const { id, inviteId } = await boardWithInvite();
    await joinBoard(bob.db, bob.actor, { id: inviteId, boardId: id });
    expect((await getInvite(alice.db, inviteId))?.usedBy).toBe(bob.actor.uid);
    expect(await resolveInvite(bob.db, bob.actor.uid, inviteId)).toEqual({
      state: "member",
      boardId: id,
    });
  });

  it("rejects a third member using the same link", async () => {
    const { alice, bob, carol } = accounts;
    const { id, inviteId } = await pairedBoard(alice, bob);
    await expectDenied(joinBoard(carol.db, carol.actor, { id: inviteId, boardId: id }));
  });

  it("rejects an expired invite", async () => {
    const { alice, bob } = accounts;
    const { id, name } = await soloBoard(alice);
    const inviteId = await inviteExpiringAt(
      alice,
      id,
      name,
      Timestamp.fromMillis(Date.now() - DAY_MS),
    );
    await expectDenied(joinBoard(bob.db, bob.actor, { id: inviteId, boardId: id }));
  });

  it("rejects a replaced invite", async () => {
    const { alice, bob } = accounts;
    const { id, name, inviteId } = await boardWithInvite();
    await generateInvite(alice.db, alice.actor, boardOf(id, name, inviteId));
    await expectDenied(joinBoard(bob.db, bob.actor, { id: inviteId, boardId: id }));
  });

  it("doesn't let someone who left rejoin alone through the old link", async () => {
    const { alice, bob } = accounts;
    const { id, inviteId } = await pairedBoard(alice, bob);
    await leaveBoard(bob.db, bob.actor, id);
    await expectDenied(joinBoard(bob.db, bob.actor, { id: inviteId, boardId: id }));
  });

  it("doesn't let an invite be used up without joining", async () => {
    const { bob } = accounts;
    const { inviteId } = await boardWithInvite();
    await expectDenied(
      updateDoc(doc(bob.db, "invites", inviteId), { usedBy: bob.actor.uid }),
    );
  });

  it("doesn't let an invite be marked as used by someone else", async () => {
    const { bob, carol } = accounts;
    const { id, inviteId } = await boardWithInvite();
    const batch = writeBatch(bob.db);
    batch.update(doc(bob.db, "invites", inviteId), { usedBy: carol.actor.uid });
    batch.update(doc(bob.db, "boards", id), { members: [accounts.alice.actor.uid, bob.actor.uid] });
    await expectDenied(batch.commit());
  });

  it("doesn't let the join change any other board field", async () => {
    const { bob } = accounts;
    const { id, inviteId } = await boardWithInvite();
    const batch = writeBatch(bob.db);
    batch.update(doc(bob.db, "invites", inviteId), { usedBy: bob.actor.uid });
    batch.update(doc(bob.db, "boards", id), {
      members: [accounts.alice.actor.uid, bob.actor.uid],
      name: "Renamed",
    });
    await expectDenied(batch.commit());
  });
});
