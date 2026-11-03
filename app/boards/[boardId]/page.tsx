import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { BoardScreen } from "@/components/screens/board-screen";

// useParams suspends for params unknown at build time, so it needs this boundary.
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <BoardScreen />
    </Suspense>
  );
}
