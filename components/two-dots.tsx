// The app's motif: two people, one pastel each, joined by a wobbly line.
export function TwoDots({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 72"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M38 40c14-16 26-18 38-8s22 14 34 4 24-14 36-4 18 12 34-2"
        stroke="var(--muted-foreground)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <path
        d="M24 21c10-2 20 6 20 18s-8 21-20 20S4 50 5 38s9-15 19-17Z"
        fill="var(--primary)"
      />
      <path
        d="M196 11c11 0 19 9 19 20s-9 20-20 19-18-9-18-20 8-19 19-19Z"
        fill="var(--secondary)"
      />
    </svg>
  );
}
