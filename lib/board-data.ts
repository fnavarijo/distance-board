import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type FirestoreError,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { keyForTop, type Orderable, planMove } from "./ordering";

export const LIMITS = {
  boardName: 60,
  itemTitle: 200,
  note: 140,
} as const;

export const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

// Each write's rule reads the board, and a batch allows 20 document reads in total.
const MAX_BATCH_WRITES = 10;

export type Person = { uid: string; name: string; photoURL: string | null };

export type Board = {
  id: string;
  name: string;
  members: string[];
  currentInviteId: string | null;
  createdBy: string;
};

export type Note = {
  id: string;
  text: string;
  author: Person;
  createdAt: Timestamp;
};

export type Item = {
  id: string;
  title: string;
  order: string;
  createdBy: Person;
  createdAt: Timestamp;
  completedBy: Person | null;
  completedAt: Timestamp | null;
  notes: Note[];
};

export type Invite = {
  id: string;
  boardId: string;
  boardName: string;
  inviterName: string;
  createdBy: string;
  expiresAt: Timestamp;
  usedBy: string | null;
};

export type InviteResolution =
  | { state: "gone" }
  | { state: "member"; boardId: string }
  | { state: "full" }
  | { state: "expired" }
  | { state: "joinable"; invite: Invite };

const boardRef = (db: Firestore, boardId: string) =>
  doc(db, "boards", boardId);
const itemsRef = (db: Firestore, boardId: string) =>
  collection(db, "boards", boardId, "items");
const itemRef = (db: Firestore, boardId: string, itemId: string) =>
  doc(db, "boards", boardId, "items", itemId);
const inviteRef = (db: Firestore, inviteId: string) =>
  doc(db, "invites", inviteId);

// Checks the code because the SDK's errors aren't instances of its FirestoreError export.
function isPermissionDenied(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "permission-denied";
}

function toBoard(snapshot: DocumentSnapshot<DocumentData>): Board {
  const data = snapshot.data()!;
  return {
    id: snapshot.id,
    name: data.name,
    members: data.members,
    currentInviteId: data.currentInviteId,
    createdBy: data.createdBy,
  };
}

function toInvite(snapshot: DocumentSnapshot<DocumentData>): Invite {
  const data = snapshot.data()!;
  return {
    id: snapshot.id,
    boardId: data.boardId,
    boardName: data.boardName,
    inviterName: data.inviterName,
    createdBy: data.createdBy,
    expiresAt: data.expiresAt,
    usedBy: data.usedBy,
  };
}

function toItem(snapshot: DocumentSnapshot<DocumentData>): Item {
  // Pending server timestamps are estimated so that new items sort correctly at once.
  const data = snapshot.data({ serverTimestamps: "estimate" })!;
  const notes = Object.entries(
    data.notes as Record<string, Omit<Note, "id">>,
  ).map(([id, note]) => ({ ...note, id }));
  notes.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  return {
    id: snapshot.id,
    title: data.title,
    order: data.order,
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    completedBy: data.completedBy,
    completedAt: data.completedAt,
    notes,
  };
}

// Boards

export async function createBoard(
  db: Firestore,
  actor: Person,
  name: string,
): Promise<string> {
  const ref = doc(collection(db, "boards"));
  await setDoc(ref, {
    name,
    members: [actor.uid],
    currentInviteId: null,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyBoards(
  db: Firestore,
  uid: string,
): Promise<Board[]> {
  const snapshot = await getDocs(
    query(collection(db, "boards"), where("members", "array-contains", uid)),
  );
  return snapshot.docs
    .map(toBoard)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function subscribeToBoard(
  db: Firestore,
  boardId: string,
  onBoard: (board: Board | null) => void,
  onError: (error: FirestoreError) => void,
): () => void {
  return onSnapshot(
    boardRef(db, boardId),
    (snapshot) => onBoard(snapshot.exists() ? toBoard(snapshot) : null),
    onError,
  );
}

async function deleteInviteIfPresent(db: Firestore, inviteId: string | null) {
  if (!inviteId) return;
  // The delete rule reads the invite, so deleting one that's already gone is denied.
  const snapshot = await getDoc(inviteRef(db, inviteId));
  if (snapshot.exists()) await deleteDoc(snapshot.ref);
}

async function deleteAllItems(db: Firestore, boardId: string) {
  const items = await getDocs(itemsRef(db, boardId));
  for (let start = 0; start < items.docs.length; start += MAX_BATCH_WRITES) {
    const batch = writeBatch(db);
    for (const item of items.docs.slice(start, start + MAX_BATCH_WRITES)) {
      batch.delete(item.ref);
    }
    await batch.commit();
  }
}

// Removes the actor from the board. A last member deletes it instead, with the board
// document going last so that an interrupted delete can be finished by leaving again.
export async function leaveBoard(
  db: Firestore,
  actor: Person,
  boardId: string,
): Promise<void> {
  const ref = boardRef(db, boardId);
  const board = toBoard(await getDoc(ref));
  if (board.members.length > 1) {
    await updateDoc(ref, { members: arrayRemove(actor.uid) });
    return;
  }
  await deleteAllItems(db, boardId);
  await deleteInviteIfPresent(db, board.currentInviteId);
  await deleteDoc(ref);
}

// Invites

export async function getInvite(
  db: Firestore,
  inviteId: string,
): Promise<Invite | null> {
  const snapshot = await getDoc(inviteRef(db, inviteId));
  return snapshot.exists() ? toInvite(snapshot) : null;
}

// Creates a link, or replaces the current one so the old link stops working at once.
export async function generateInvite(
  db: Firestore,
  actor: Person,
  board: Pick<Board, "id" | "name" | "currentInviteId">,
): Promise<string> {
  const previous = board.currentInviteId
    ? await getDoc(inviteRef(db, board.currentInviteId))
    : null;

  const ref = doc(collection(db, "invites"));
  const batch = writeBatch(db);
  batch.set(ref, {
    boardId: board.id,
    boardName: board.name,
    inviterName: actor.name,
    createdBy: actor.uid,
    expiresAt: Timestamp.fromMillis(Date.now() + INVITE_LIFETIME_MS),
    usedBy: null,
  });
  batch.update(boardRef(db, board.id), { currentInviteId: ref.id });
  if (previous?.exists()) batch.delete(previous.ref);
  await batch.commit();
  return ref.id;
}

export async function resolveInvite(
  db: Firestore,
  uid: string,
  inviteId: string,
): Promise<InviteResolution> {
  const invite = await getInvite(db, inviteId);
  if (!invite) return { state: "gone" };

  // Only members can read a board, so a denied read just means "not a member".
  try {
    const board = await getDoc(boardRef(db, invite.boardId));
    if (board.exists() && toBoard(board).members.includes(uid)) {
      return { state: "member", boardId: invite.boardId };
    }
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
  }

  if (invite.usedBy !== null) return { state: "full" };
  if (invite.expiresAt.toMillis() <= Date.now()) return { state: "expired" };
  return { state: "joinable", invite };
}

export async function joinBoard(
  db: Firestore,
  actor: Person,
  invite: Pick<Invite, "id" | "boardId">,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(inviteRef(db, invite.id), { usedBy: actor.uid });
  batch.update(boardRef(db, invite.boardId), {
    members: arrayUnion(actor.uid),
  });
  await batch.commit();
}

export { isPermissionDenied };

// Items

export function subscribeToItems(
  db: Firestore,
  boardId: string,
  onItems: (items: Item[]) => void,
  onError: (error: FirestoreError) => void,
): () => void {
  return onSnapshot(
    itemsRef(db, boardId),
    (snapshot) => onItems(snapshot.docs.map(toItem)),
    onError,
  );
}

export async function addItem(
  db: Firestore,
  actor: Person,
  boardId: string,
  items: readonly Orderable[],
  title: string,
): Promise<string> {
  const ref = doc(itemsRef(db, boardId));
  await setDoc(ref, {
    title,
    order: keyForTop(items),
    createdBy: actor,
    createdAt: serverTimestamp(),
    completedBy: null,
    completedAt: null,
    notes: {},
  });
  return ref.id;
}

export function editItemTitle(
  db: Firestore,
  boardId: string,
  itemId: string,
  title: string,
): Promise<void> {
  return updateDoc(itemRef(db, boardId, itemId), { title });
}

export async function moveItem(
  db: Firestore,
  boardId: string,
  items: readonly Orderable[],
  itemId: string,
  toIndex: number,
): Promise<void> {
  const writes = planMove(items, itemId, toIndex);
  for (let start = 0; start < writes.length; start += MAX_BATCH_WRITES) {
    const batch = writeBatch(db);
    for (const write of writes.slice(start, start + MAX_BATCH_WRITES)) {
      batch.update(itemRef(db, boardId, write.id), { order: write.order });
    }
    await batch.commit();
  }
}

export function completeItem(
  db: Firestore,
  actor: Person,
  boardId: string,
  itemId: string,
): Promise<void> {
  return updateDoc(itemRef(db, boardId, itemId), {
    completedBy: actor,
    completedAt: serverTimestamp(),
  });
}

export function restoreItem(
  db: Firestore,
  boardId: string,
  items: readonly Orderable[],
  itemId: string,
): Promise<void> {
  return updateDoc(itemRef(db, boardId, itemId), {
    completedBy: null,
    completedAt: null,
    order: keyForTop(items),
  });
}

export function deleteItem(
  db: Firestore,
  boardId: string,
  itemId: string,
): Promise<void> {
  return deleteDoc(itemRef(db, boardId, itemId));
}

// Notes

export async function addNote(
  db: Firestore,
  actor: Person,
  boardId: string,
  itemId: string,
  text: string,
): Promise<string> {
  const noteId = doc(collection(db, "ids")).id;
  // A field-path update keeps two people's simultaneous notes from overwriting each other.
  await updateDoc(itemRef(db, boardId, itemId), {
    [`notes.${noteId}`]: {
      text,
      author: actor,
      createdAt: serverTimestamp(),
    },
  });
  return noteId;
}

export function deleteNote(
  db: Firestore,
  boardId: string,
  itemId: string,
  noteId: string,
): Promise<void> {
  return updateDoc(itemRef(db, boardId, itemId), {
    [`notes.${noteId}`]: deleteField(),
  });
}
