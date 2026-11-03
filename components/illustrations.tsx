// Hand-drawn-style illustrations for empty states (UI-3).
const stroke = {
  stroke: "var(--muted-foreground)",
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Blobs() {
  return (
    <>
      <path d="M36 62c13-3 27 8 27 24s-11 28-27 27-27-12-26-28 13-20 26-23Z" fill="var(--primary)" />
      <path d="M204 52c15 0 26 12 26 27s-12 27-27 26-25-12-25-27 11-26 26-26Z" fill="var(--secondary)" />
    </>
  );
}

// A heart waiting between two people: nothing on the list yet.
export function EmptyListArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 130" fill="none" aria-hidden="true" className={className}>
      <Blobs />
      <path d="M70 84c8-6 13-8 20-7M170 78c-7-3-13-3-20 1" {...stroke} strokeDasharray="1 8" />
      <path
        d="M120 92c-14-9-24-18-24-30 0-8 6-13 12-13 5 0 10 3 12 9 3-6 8-9 13-9 7 0 12 6 12 13 0 12-11 21-25 30Z"
        {...stroke}
        fill="var(--card)"
      />
    </svg>
  );
}

// Two people, far apart, with a line still to be drawn: no boards yet.
export function NoBoardsArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 130" fill="none" aria-hidden="true" className={className}>
      <Blobs />
      <path d="M70 84c17-18 30-20 43-10s24 13 58-3" {...stroke} strokeDasharray="1 9" />
      <path d="M116 42l3 10 10 3-10 3-3 10-3-10-10-3 10-3 3-10Z" {...stroke} fill="var(--card)" />
    </svg>
  );
}

// A line that doesn't quite connect: an invite that no longer works.
export function BrokenLinkArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 130" fill="none" aria-hidden="true" className={className}>
      <Blobs />
      <path d="M70 84c12-9 22-12 32-10" {...stroke} strokeDasharray="1 9" />
      <path d="M170 78c-11-3-20-3-30 2" {...stroke} strokeDasharray="1 9" />
      <path d="M114 64l12 22M126 64l-12 22" {...stroke} />
    </svg>
  );
}
