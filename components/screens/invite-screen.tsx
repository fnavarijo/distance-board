"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { useUser } from "@/components/auth-provider";
import { FriendlyPage } from "@/components/friendly-page";
import { Loading } from "@/components/loading";
import { TwoDots } from "@/components/two-dots";
import { Button } from "@/components/ui/button";
import {
  type Invite,
  type InviteResolution,
  isPermissionDenied,
  joinBoard,
  resolveInvite,
} from "@/lib/board-data";
import { getFirebase } from "@/lib/firebase";

type Resolved = InviteResolution | { state: "loading" } | { state: "error" };

function JoinCard({ invite, onDenied }: { invite: Invite; onDenied: () => void }) {
  const user = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await joinBoard(getFirebase().db, user, invite);
      router.replace(`/boards/${invite.boardId}`);
    } catch (caught) {
      setBusy(false);
      // Someone may have got there first, so show whatever the invite's state is now.
      if (isPermissionDenied(caught)) onDenied();
      else setError("That didn't work. Check your connection and try again.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 py-12">
      <TwoDots className="w-48" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight">
          {invite.inviterName} invited you to {invite.boardName}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          You&apos;ll share one list of things to do together.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={join} disabled={busy}>
          Join board
        </Button>
        {error && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

function ResolvedInvite({ inviteId }: { inviteId: string }) {
  const user = useUser();
  const router = useRouter();
  const [resolved, setResolved] = useState<Resolved>({ state: "loading" });

  const resolve = useCallback(() => {
    return resolveInvite(getFirebase().db, user.uid, inviteId).then(
      (result): Resolved => result,
      (): Resolved => ({ state: "error" }),
    );
  }, [inviteId, user.uid]);

  // Runs again whenever this route becomes visible, so a stale state never lingers.
  useEffect(() => {
    let current = true;
    resolve().then((result) => {
      if (current) setResolved(result);
    });
    return () => {
      current = false;
    };
  }, [resolve]);

  const memberOf = resolved.state === "member" ? resolved.boardId : null;
  useEffect(() => {
    if (memberOf) router.replace(`/boards/${memberOf}`);
  }, [memberOf, router]);

  switch (resolved.state) {
    case "loading":
    case "member":
      return <Loading />;
    case "joinable":
      return (
        <JoinCard
          invite={resolved.invite}
          onDenied={() => resolve().then(setResolved)}
        />
      );
    case "full":
      return (
        <FriendlyPage title="This board is full">
          Boards are for two people, and this one already has its pair.
        </FriendlyPage>
      );
    case "expired":
      return (
        <FriendlyPage title="This invite has expired">
          Invite links last 7 days. Ask for a new one.
        </FriendlyPage>
      );
    case "gone":
      return (
        <FriendlyPage title="This invite no longer works">
          It was replaced by a newer link, or the board was deleted. Ask for a new one.
        </FriendlyPage>
      );
    case "error":
      return (
        <FriendlyPage title="We couldn't open this invite">
          Check your connection, then open the link again.
        </FriendlyPage>
      );
  }
}

export function InviteScreen() {
  const { inviteId } = useParams<{ inviteId: string }>();
  return (
    <AuthGate invited>
      <ResolvedInvite key={inviteId} inviteId={inviteId} />
    </AuthGate>
  );
}
