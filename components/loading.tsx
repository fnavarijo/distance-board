import { TwoDots } from "@/components/two-dots";

export function Loading() {
  return (
    <main className="flex flex-1 items-center justify-center" role="status">
      <TwoDots className="w-28 animate-pulse" />
      <span className="sr-only">Loading</span>
    </main>
  );
}
