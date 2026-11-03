import { TwoDots } from "@/components/two-dots";
import { Button } from "@/components/ui/button";

// Theme sample for task 1. The landing page replaces it in task 2.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-12">
      <TwoDots className="w-44" />
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl leading-[1.1]">Distance Board</h1>
        <p className="text-lg text-muted-foreground">
          Nothing here yet, what should you two do first?
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
        <span className="size-6 shrink-0 rounded-full border-2 border-input" />
        <span className="font-semibold">Watch the sunrise on a video call</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button>Add an idea</Button>
        <Button variant="secondary">Invite someone</Button>
        <Button variant="ghost">Done</Button>
      </div>
    </main>
  );
}
