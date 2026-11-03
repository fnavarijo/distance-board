"use client";

import { useEffect, useState } from "react";
import { type Board, listMyBoards } from "@/lib/board-data";
import { getFirebase } from "@/lib/firebase";

export type MyBoards =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; boards: Board[] };

// A one-shot read, because only the board on screen may hold a listener (COST-6).
// The effect runs again when a hidden route becomes visible, which refreshes the list.
export function useMyBoards(uid: string): MyBoards {
  const [state, setState] = useState<MyBoards>({ status: "loading" });

  useEffect(() => {
    let current = true;
    listMyBoards(getFirebase().db, uid).then(
      (boards) => {
        if (current) setState({ status: "ready", boards });
      },
      () => {
        if (current) setState({ status: "error" });
      },
    );
    return () => {
      current = false;
    };
  }, [uid]);

  return state;
}
