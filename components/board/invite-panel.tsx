"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Board, generateInvite, getInvite } from "@/lib/board-data";
import { getFirebase } from "@/lib/firebase";

type Link = { inviteId: string; expiresAt: Date };

export function InvitePanel({ board }: { board: Board }) {
  const user = useUser();
  const [link, setLink] = useState<Link | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A used or expired invite counts as no link, so the member can make a new one.
  useEffect(() => {
    if (!board.currentInviteId) return;
    let current = true;
    getInvite(getFirebase().db, board.currentInviteId).then(
      (invite) => {
        if (!current) return;
        const usable =
          invite && invite.usedBy === null && invite.expiresAt.toMillis() > Date.now();
        setLink(
          usable ? { inviteId: invite.id, expiresAt: invite.expiresAt.toDate() } : null,
        );
      },
      () => {
        if (current) setLink(null);
      },
    );
    return () => {
      current = false;
    };
  }, [board.currentInviteId]);

  async function generate() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      await generateInvite(getFirebase().db, user, board);
    } catch {
      setError("That link didn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const url = link ? `${window.location.origin}/invite/${link.inviteId}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Your browser wouldn't copy it. Select the link and copy it yourself.");
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-secondary/50 p-5">
      <div>
        <h2 className="text-xl">Invite your person</h2>
        <p className="text-pretty text-muted-foreground">
          {link
            ? `This link works once, until ${link.expiresAt.toLocaleDateString(undefined, { month: "long", day: "numeric" })}.`
            : "Send them a link so you can share this list."}
        </p>
      </div>
      {link ? (
        <>
          <Input
            readOnly
            value={url}
            aria-label="Invite link"
            onFocus={(event) => event.target.select()}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={copy}>{copied ? "Copied" : "Copy link"}</Button>
            <Button variant="ghost" onClick={generate} disabled={busy}>
              Make a new link
            </Button>
          </div>
        </>
      ) : (
        <Button className="self-start" onClick={generate} disabled={busy}>
          Create invite link
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
