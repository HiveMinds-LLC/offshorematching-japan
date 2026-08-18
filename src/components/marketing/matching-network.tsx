"use client";

import { useState } from "react";

type Point = { x: number; y: number };

const lineEnds: Array<[Point, Point]> = [
  [{ x: -40, y: 90 }, { x: 760, y: 430 }],
  [{ x: 90, y: -40 }, { x: 740, y: 520 }],
  [{ x: -30, y: 420 }, { x: 760, y: 80 }],
  [{ x: 140, y: 590 }, { x: 760, y: 120 }]
];

export function MatchingNetwork() {
  const [pointer, setPointer] = useState<Point | null>(null);

  function pathFor(start: Point, end: Point) {
    if (!pointer) return `M${start.x} ${start.y}L${end.x} ${end.y}`;
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const control = {
      x: midpoint.x + (pointer.x - midpoint.x) * 0.62,
      y: midpoint.y + (pointer.y - midpoint.y) * 0.62
    };
    return `M${start.x} ${start.y}Q${control.x} ${control.y} ${end.x} ${end.y}`;
  }

  return (
    <svg
      aria-hidden="true"
      className="matching-network absolute inset-y-0 right-0 h-full w-[58%] min-w-[520px] opacity-70"
      fill="none"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({ x: ((event.clientX - rect.left) / rect.width) * 780, y: ((event.clientY - rect.top) / rect.height) * 560 });
      }}
      viewBox="0 0 780 560"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="matching-line" x1="34" x2="712" y1="80" y2="472" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" stopOpacity="0" />
          <stop offset="0.3" stopColor="#2563EB" stopOpacity="0.7" />
          <stop offset="0.7" stopColor="#06B6D4" stopOpacity="0.7" />
          <stop offset="1" stopColor="#06B6D4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="matching-network-lines" stroke="url(#matching-line)" strokeWidth="1.5">
        {lineEnds.map(([start, end], index) => <path key={index} d={pathFor(start, end)} />)}
      </g>
    </svg>
  );
}
