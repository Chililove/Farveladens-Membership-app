import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/app/components/ThemeToggle";
import PaintSplashes from "@/app/components/PaintSplashes";
import Logo from "@/app/components/Logo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// The forening's display font, used for the logo like on their website.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Farveladen - Membership",
  description:
    "Membership and payment tracking for Rytmisk Farvelade Forening.",
};

// Runs before first paint so a returning visitor who chose light mode never
// sees a flash of the dark theme (or the other way round).
const themeScript = `
(function () {
  try {
    if (localStorage.getItem("theme") === "light") {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-[#fbf6ec] text-gray-900 dark:bg-[#0a0a0c] dark:text-gray-100">
        <PaintSplashes />
        {/* Header like the forening's website: logo left, theme toggle right. */}
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-6">
          <Logo />
          <ThemeToggle />
        </header>
        {children}
      </body>
    </html>
  );
}
