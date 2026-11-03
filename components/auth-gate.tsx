"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { Landing } from "@/components/landing";
import { Loading } from "@/components/loading";

// Renders sign-in in place on whichever route was opened. signInWithPopup never navigates
// away, so an invite link survives sign-in without storing a return URL (NAV-4).
export function AuthGate({
  children,
  invited,
}: {
  children: ReactNode;
  invited?: boolean;
}) {
  const auth = useAuth();
  if (auth.status === "loading") return <Loading />;
  if (auth.status === "signed-out") return <Landing invited={invited} />;
  return children;
}
