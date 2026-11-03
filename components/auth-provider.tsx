"use client";

import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { Person } from "@/lib/board-data";
import { getFirebase } from "@/lib/firebase";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: Person };

const AuthContext = createContext<AuthState>({ status: "loading" });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(
    () =>
      onAuthStateChanged(getFirebase().auth, (user) => {
        setState(
          user
            ? {
                status: "signed-in",
                user: {
                  uid: user.uid,
                  name: user.displayName ?? "Someone",
                  photoURL: user.photoURL,
                },
              }
            : { status: "signed-out" },
        );
      }),
    [],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// For components rendered inside AuthGate, where someone is always signed in.
export function useUser(): Person {
  const auth = useAuth();
  if (auth.status !== "signed-in") throw new Error("useUser needs a signed-in user");
  return auth.user;
}

export const signOut = () => firebaseSignOut(getFirebase().auth);
