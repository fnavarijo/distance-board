import Link from "next/link";
import type { ReactNode } from "react";
import { BrokenLinkArt } from "@/components/illustrations";
import { Button } from "@/components/ui/button";

// Shown instead of a crash or a raw permission error (INV-5).
export function FriendlyPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 py-12">
      <BrokenLinkArt className="w-52" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight">{title}</h1>
        <p className="text-lg text-pretty text-muted-foreground">{children}</p>
      </div>
      <Button
        className="self-start"
        nativeButton={false}
        render={<Link href="/boards">Go to your boards</Link>}
      />
    </main>
  );
}
