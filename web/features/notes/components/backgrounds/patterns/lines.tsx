// Lines pattern: spacing = 24px, strokeWidth = 1px, starts at 24px
export function LinesPattern({ color }: { color: string }) {
  return (
    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern
          id="lines-pattern"
          x="0"
          y="0"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="24"
            x2="100%"
            y2="24"
            stroke={color}
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lines-pattern)" />
    </svg>
  );
}
