"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthGate } from "@/components/auth-gate";
import { useUser } from "@/components/auth-provider";
import { Loading } from "@/components/loading";
import { BoardsView } from "@/components/screens/boards-view";
import { useMyBoards } from "@/lib/hooks/use-my-boards";

function Resolver() {
  const user = useUser();
  const router = useRouter();
  const state = useMyBoards(user.uid);
  const onlyBoard =
    state.status === "ready" && state.boards.length === 1 ? state.boards[0].id : null;

  // Replaces history, so Back from the board doesn't land here and bounce forward again.
  useEffect(() => {
    if (onlyBoard) router.replace(`/boards/${onlyBoard}`);
  }, [onlyBoard, router]);

  if (onlyBoard) return <Loading />;
  return <BoardsView state={state} />;
}

export function HomeScreen() {
  return (
    <AuthGate>
      <Resolver />
    </AuthGate>
  );
}
