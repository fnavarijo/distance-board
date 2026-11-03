"use client";

import Link from "next/link";
import { signOut } from "@/components/auth-provider";
import { TwoDots } from "@/components/two-dots";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 pt-5">
      <Link href="/boards" aria-label="Your boards" className="rounded-full p-1">
        <TwoDots className="w-20" />
      </Link>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        Sign out
      </Button>
    </header>
  );
}
