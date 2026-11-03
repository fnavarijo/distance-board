import { deleteApp, type FirebaseApp, initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { leaveBoard, listMyBoards, type Person } from "../lib/board-data";

export type Account = { app: FirebaseApp; db: Firestore; actor: Person };
export type Accounts = { alice: Account; bob: Account; carol: Account };

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function signIn(
  index: number,
  label: string,
): Promise<Account> {
  const email = process.env[`TEST_USER_${index}_EMAIL`];
  const password = process.env[`TEST_USER_${index}_PASSWORD`];
  if (!email || !password) throw new Error(`Missing test user ${index} in .env.test.local`);

  const app = initializeApp(config, `${label}-${Date.now()}`);
  const { user } = await signInWithEmailAndPassword(getAuth(app), email, password);
  return {
    app,
    db: getFirestore(app),
    actor: { uid: user.uid, name: `Test ${label}`, photoURL: null },
  };
}

// A crashed run can't clean up after itself, so each run also starts by sweeping (TEST-5).
export async function sweep(accounts: Accounts) {
  for (const account of Object.values(accounts)) {
    for (const board of await listMyBoards(account.db, account.actor.uid)) {
      await leaveBoard(account.db, account.actor, board.id);
    }
  }
}

export async function setUp(): Promise<Accounts> {
  const accounts = {
    alice: await signIn(1, "alice"),
    bob: await signIn(2, "bob"),
    carol: await signIn(3, "carol"),
  };
  await sweep(accounts);
  return accounts;
}

export async function tearDown(accounts: Accounts) {
  await sweep(accounts);
  for (const account of Object.values(accounts)) {
    await signOut(getAuth(account.app));
    await deleteApp(account.app);
  }
}

