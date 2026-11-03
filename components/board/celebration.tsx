"use client";

import type { CSSProperties } from "react";

const COLORS = ["var(--primary)", "var(--secondary)", "var(--input)"];
const DOTS = Array.from({ length: 9 }, (_, index) => index);

// A small burst of pastel dots at the checkbox. It removes itself when the animation
// ends, which also happens at once under prefers-reduced-motion.
export function Celebration({
  x,
  y,
  onDone,
}: {
  x: number;
  y: number;
  onDone: () => void;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed z-50" style={{ left: x, top: y }}>
      {DOTS.map((index) => (
        <span
          key={index}
          className="burst-dot absolute size-2.5 rounded-full"
          style={
            {
              backgroundColor: COLORS[index % COLORS.length],
              "--burst-angle": `${index * 40}deg`,
            } as CSSProperties
          }
          onAnimationEnd={index === 0 ? onDone : undefined}
        />
      ))}
    </div>
  );
}
