"use client";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { useUser } from "@/components/auth-provider";
import { Avatar } from "@/components/avatar";
import { CreateBoardForm } from "@/components/create-board-form";
import { FriendlyPage } from "@/components/friendly-page";
import { NoBoardsArt } from "@/components/illustrations";
import { Loading } from "@/components/loading";
import { type Board, otherMember } from "@/lib/board-data";
import type { MyBoards } from "@/lib/hooks/use-my-boards";

function SharedWith({ board }: { board: Board }) {
  const user = useUser();
  const other = otherMember(board, user.uid);
  const textClass = "truncate text-sm font-semibold text-muted-foreground";

  switch (other.status) {
    case "waiting":
      return <span className={textClass}>Waiting for someone to join</span>;
    case "unknown":
      return <span className={textClass}>Shared with someone</span>;
    case "partner":
      return (
        <span className="flex min-w-0 items-center gap-2">
          {/* The key resets a failed photo when a new partner takes this row. */}
          <Avatar key={other.person.uid} person={other.person} decorative />
          <span className={textClass}>with {other.person.name}</span>
        </span>
      );
  }
}

export function BoardsView({ state }: { state: MyBoards }) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "error") {
    return (
      <FriendlyPage title="We couldn't load your boards">
        Check your connection and try again.
      </FriendlyPage>
    );
  }

  if (state.boards.length === 0) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 pb-16">
          <NoBoardsArt className="w-56" />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl leading-tight">Start your first board</h1>
            <p className="text-lg text-pretty text-muted-foreground">
              Give it a name, then invite the person you want to share it with.
            </p>
          </div>
          <CreateBoardForm />
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 py-8">
        <h1 className="text-3xl leading-tight">Your boards</h1>
        <ul className="flex flex-col gap-3">
          {state.boards.map((board) => (
            <li key={board.id}>
              <Link
                href={`/boards/${board.id}`}
                className="flex flex-col gap-1 rounded-2xl bg-card p-4 shadow-soft transition-shadow hover:shadow-lifted"
              >
                <span className="truncate text-lg font-bold">{board.name}</span>
                <SharedWith board={board} />
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 pt-4">
          <h2 className="text-xl">Start another board</h2>
          <CreateBoardForm />
        </div>
      </main>
    </>
  );
}
