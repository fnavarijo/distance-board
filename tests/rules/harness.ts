import { collection, doc, Timestamp, writeBatch } from "firebase/firestore";
import { expect } from "vitest";
import {
  type Board,
  createBoard,
  generateInvite,
  isPermissionDenied,
  joinBoard,
} from "../../lib/board-data";
import type { Account } from "../accounts";

export { type Account, type Accounts, setUp, tearDown } from "../accounts";

export async function expectDenied(attempt: Promise<unknown>) {
  const error = await attempt.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(isPermissionDenied(error), `expected a denial, got: ${error}`).toBe(true);
}

export function boardOf(id: string, name: string, currentInviteId: string | null) {
  return { id, name, currentInviteId } satisfies Pick<
    Board,
    "id" | "name" | "currentInviteId"
  >;
}

export async function soloBoard(owner: Account, name = "Test board") {
  const id = await createBoard(owner.db, owner.actor, name);
  return { id, name };
}

export async function pairedBoard(owner: Account, partner: Account) {
  const { id, name } = await soloBoard(owner);
  const inviteId = await generateInvite(owner.db, owner.actor, boardOf(id, name, null));
  await joinBoard(partner.db, partner.actor, { id: inviteId, boardId: id });
  return { id, name, inviteId };
}

// The app never writes an invite with a chosen expiry, so these tests do it directly.
export async function inviteExpiringAt(
  owner: Account,
  boardId: string,
  name: string,
  expiresAt: Timestamp,
) {
  const ref = doc(collection(owner.db, "invites"));
  const batch = writeBatch(owner.db);
  batch.set(ref, {
    boardId,
    boardName: name,
    inviterName: owner.actor.name,
    createdBy: owner.actor.uid,
    expiresAt,
    usedBy: null,
  });
  batch.update(doc(owner.db, "boards", boardId), { currentInviteId: ref.id });
  await batch.commit();
  return ref.id;
}
