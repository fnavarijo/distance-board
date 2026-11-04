"use client";

import { AuthGate } from "@/components/auth-gate";
import { useUser } from "@/components/auth-provider";
import { BoardsView } from "@/components/screens/boards-view";
import { useMyBoards } from "@/lib/hooks/use-my-boards";

function Boards() {
  const user = useUser();
  return <BoardsView state={useMyBoards(user)} />;
}

export function BoardsScreen() {
  return (
    <AuthGate>
      <Boards />
    </AuthGate>
  );
}
