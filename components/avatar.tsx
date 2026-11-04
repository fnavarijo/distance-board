"use client";

import { useState } from "react";
import type { Person } from "@/lib/board-data";

// A plain <img> on purpose: next/image would use Vercel's image quota (COST-4). Google
// avatar URLs can fail when a referrer is sent, and test accounts have no photo at all.
// `decorative` is for when the person's name is already next to it, so it isn't read twice.
export function Avatar({ person, decorative = false }: { person: Person; decorative?: boolean }) {
  const [failed, setFailed] = useState(false);
  const label = `${person.name}'s avatar`;

  if (!person.photoURL || failed) {
    return (
      <span
        {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground"
      >
        {person.name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={person.photoURL}
      alt={decorative ? "" : label}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-6 shrink-0 rounded-full object-cover"
    />
  );
}
