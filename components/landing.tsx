"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import dynamic from "next/dynamic";
import { useState } from "react";
import { TwoDots } from "@/components/two-dots";
import { Button } from "@/components/ui/button";
import { signInErrorMessage } from "@/lib/auth-errors";
import { getFirebase } from "@/lib/firebase";

// A static reference, so a build without the flag drops this import entirely (TEST-4).
const TestSignIn =
  process.env.NEXT_PUBLIC_TEST_SIGN_IN === "1"
    ? dynamic(() => import("@/components/test-sign-in"), { ssr: false })
    : null;

export function Landing({ invited = false }: { invited?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function continueWithGoogle() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(getFirebase().auth, new GoogleAuthProvider());
    } catch (caught) {
      setError(signInErrorMessage((caught as { code?: string }).code));
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-12">
      <TwoDots className="w-48" />
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl leading-[1.1]">
          {invited ? "You've been invited to a board" : "Distance Board"}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {invited
            ? "Sign in to see who it's from and join them."
            : "A shared list of things you two want to do together, however far apart you are."}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={continueWithGoogle} disabled={signingIn}>
          Continue with Google
        </Button>
        {error && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
      </div>
      {TestSignIn && <TestSignIn />}
    </main>
  );
}
