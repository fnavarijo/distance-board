"use client";

import { useEffect, useState } from "react";
import { type Board, listMyBoards, type Person, syncMyProfile } from "@/lib/board-data";
import { getFirebase } from "@/lib/firebase";

export type MyBoards =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; boards: Board[] };

// A one-shot read, because only the board on screen may hold a listener (COST-6). Each load
// also brings the user's details on those boards up to date.
// The effect runs again when a hidden route becomes visible, which refreshes the list.
export function useMyBoards(user: Person): MyBoards {
  const [state, setState] = useState<MyBoards>({ status: "loading" });

  useEffect(() => {
    let current = true;
    const { db } = getFirebase();
    listMyBoards(db, user.uid).then(
      (boards) => {
        // Not tied to `current`: `/` redirects a one-board user as soon as this state is set.
        void syncMyProfile(db, user, boards);
        if (current) setState({ status: "ready", boards });
      },
      () => {
        if (current) setState({ status: "error" });
      },
    );
    return () => {
      current = false;
    };
  }, [user]);

  return state;
}
