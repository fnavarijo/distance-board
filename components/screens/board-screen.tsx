"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/components/auth-gate";
import { useUser } from "@/components/auth-provider";
import { BoardItems } from "@/components/board/board-items";
import { InvitePanel } from "@/components/board/invite-panel";
import { ConfirmButton } from "@/components/confirm-button";
import { FriendlyPage } from "@/components/friendly-page";
import { Loading } from "@/components/loading";
import { type Board, leaveBoard, subscribeToBoard } from "@/lib/board-data";
import { getFirebase } from "@/lib/firebase";

type BoardState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; board: Board };

function BoardContent({ boardId }: { boardId: string }) {
  const user = useUser();
  const router = useRouter();
  const [state, setState] = useState<BoardState>({ status: "loading" });
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lives in an effect inside the board route, so it detaches when the route is hidden (COST-6).
  useEffect(
    () =>
      subscribeToBoard(
        getFirebase().db,
        boardId,
        (board) => setState(board ? { status: "ready", board } : { status: "unavailable" }),
        () => setState({ status: "unavailable" }),
      ),
    [boardId],
  );

  async function leave() {
    setLeaving(true);
    setError(null);
    try {
      await leaveBoard(getFirebase().db, user, boardId);
      router.replace("/boards");
    } catch {
      setLeaving(false);
      setError("You're still on this board. Check your connection and try again.");
    }
  }

  // Leaving removes access, which the listener reports. Don't flash an error page for it.
  if (leaving || state.status === "loading") return <Loading />;
  if (state.status === "unavailable") {
    return (
      <FriendlyPage title="We can't find this board">
        It may have been deleted, or you may not be a member of it.
      </FriendlyPage>
    );
  }

  const { board } = state;
  const alone = board.members.length === 1;

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 pt-6 pb-16">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl leading-tight break-words">{board.name}</h1>
            <p className="text-muted-foreground">
              {alone ? "Just you so far" : "The two of you"}
            </p>
          </div>
          <ConfirmButton
            size="sm"
            variant="ghost"
            label="Leave"
            title={alone ? "Delete this board?" : "Leave this board?"}
            description={
              alone
                ? "You're the last member, so leaving deletes the board and everything on it. This can't be undone."
                : "The other person keeps the board and everything on it. You'd need a new invite to come back."
            }
            confirmLabel={alone ? "Delete board" : "Leave board"}
            onConfirm={leave}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
        {alone && <InvitePanel board={board} />}
        <BoardItems boardId={boardId} />
      </main>
    </>
  );
}

export function BoardScreen() {
  const { boardId } = useParams<{ boardId: string }>();
  return (
    <AuthGate>
      <BoardContent key={boardId} boardId={boardId} />
    </AuthGate>
  );
}
