import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { InviteScreen } from "@/components/screens/invite-screen";

// useParams suspends for params unknown at build time, so it needs this boundary.
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <InviteScreen />
    </Suspense>
  );
}
