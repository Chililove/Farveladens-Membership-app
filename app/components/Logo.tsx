import Link from "next/link";

// Rytmisk Farvelade Forening's logo, the same as on their website
// (rytmiskfarveladeforening.netlify.app): five colour bars like an equalizer,
// and the name in Fraunces. Lives in the header (layout.tsx), the way it does
// on the website, opposite the theme toggle.
//
// The bars bounce up together with the paint splashes, on page load and
// whenever the theme is switched (see globals.css and ThemeToggle).

const BARS = [
  { x: 0, y: 18, height: 14, color: "#FF6B4A" }, // rytme
  { x: 8, y: 10, height: 22, color: "#FFC94A" }, // sol
  { x: 16, y: 22, height: 10, color: "#1F9E93" }, // lagune
  { x: 24, y: 6, height: 26, color: "#7C5CFF" }, // violet
  { x: 32, y: 16, height: 16, color: "#E63888" }, // bær
];

export default function Logo({ label }: { label: string }) {
  return (
    <Link
      href="/dashboard"
      aria-label={label}
      className="group flex items-center gap-3 rounded-lg"
    >
      <svg viewBox="0 0 40 32" className="h-8 w-10" aria-hidden="true">
        {BARS.map((bar, i) => (
          <rect
            key={bar.color}
            x={bar.x}
            y={bar.y}
            width="6"
            height={bar.height}
            rx="2"
            fill={bar.color}
            className="logo-bar origin-bottom transition-transform duration-300 group-hover:scale-y-110"
            style={{ "--bar-delay": `${i * 70}ms` } as React.CSSProperties}
          />
        ))}
      </svg>
      <span className="font-display text-lg leading-tight text-gray-900 dark:text-gray-100">
        Rytmisk
        <br />
        Farvelade
      </span>
    </Link>
  );
}
