"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useUser } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBoard, LIMITS } from "@/lib/board-data";
import { getFirebase } from "@/lib/firebase";

export function CreateBoardForm() {
  const user = useUser();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createBoard(getFirebase().db, user, trimmed);
      setName("");
      router.push(`/boards/${id}`);
    } catch {
      setError("That board didn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={LIMITS.boardName}
          placeholder="Name your board"
          aria-label="Board name"
        />
        <Button type="submit" disabled={busy || !name.trim()}>
          Create
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
