"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFirebase } from "@/lib/firebase";

// Test-only (TEST-4). The test id doubles as the marker that the build check looks for,
// so don't reuse it anywhere else.
export default function TestSignIn() {
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await signInWithEmailAndPassword(
        getFirebase().auth,
        String(form.get("email")),
        String(form.get("password")),
      );
    } catch {
      setError("Test sign-in failed.");
    }
  }

  return (
    <form
      onSubmit={submit}
      data-testid="distance-board-test-sign-in"
      className="flex flex-col gap-2"
    >
      <Input name="email" type="email" aria-label="Test email" />
      <Input name="password" type="password" aria-label="Test password" />
      <Button type="submit" variant="ghost">
        Test sign-in
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
