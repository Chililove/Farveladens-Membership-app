"use client";

import { useSyncExternalStore } from "react";

// The theme lives on <html> as a class, not in React state - the inline script
// in layout.tsx sets it before first paint. useSyncExternalStore lets the
// button read that external value without a setState-in-effect round trip.

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

// Dark is the default, so that's what the server renders.
function getServerSnapshot() {
  return true;
}

// Restart the splashes' "landing" animation (and the logo's bouncing bars) so
// they splash in again in the new theme's colours. Clearing the animation, forcing a reflow and putting
// it back is the standard way to replay a CSS animation. People who prefer
// reduced motion have no animation in the CSS, so nothing replays for them.
function replaySplashes() {
  document.querySelectorAll<SVGElement>(".paint-splash, .logo-bar").forEach((splash) => {
    splash.style.animation = "none";
    void splash.getBoundingClientRect();
    splash.style.animation = "";
  });
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private browsing can block storage - the toggle still works for this
      // page view, it just won't be remembered.
    }
    listeners.forEach((onChange) => onChange());
    replaySplashes();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to the colourful light mode" : "Switch to dark mode"}
      className="rounded-full border border-gray-300 bg-white/80 p-2.5 text-gray-600 backdrop-blur transition hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400 dark:hover:text-gray-100"
    >
      {isDark ? (
        // Paint palette with colour dabs: light mode is the colourful one.
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.9 0-1.4-1.3-1.9-1.3-3.1 0-1.1.9-2 2-2H17a4 4 0 0 0 4-4C21 6.2 17 3 12 3z" />
          <circle cx="7.5" cy="11" r="1.4" fill="#FF6B4A" stroke="none" />
          <circle cx="10" cy="7" r="1.4" fill="#FFC94A" stroke="none" />
          <circle cx="15" cy="7" r="1.4" fill="#7C5CFF" stroke="none" />
          <circle cx="8.5" cy="15.5" r="1.4" fill="#1F9E93" stroke="none" />
        </svg>
      ) : (
        // Moon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
