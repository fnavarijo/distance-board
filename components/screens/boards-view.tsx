"use client";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { CreateBoardForm } from "@/components/create-board-form";
import { FriendlyPage } from "@/components/friendly-page";
import { NoBoardsArt } from "@/components/illustrations";
import { Loading } from "@/components/loading";
import type { MyBoards } from "@/lib/hooks/use-my-boards";

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
                className="block rounded-2xl bg-card p-4 text-lg font-bold shadow-soft transition-shadow hover:shadow-lifted"
              >
                {board.name}
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
