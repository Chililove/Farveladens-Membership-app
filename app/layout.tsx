import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/app/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-gray-900 dark:bg-[#0a0a0c] dark:text-gray-100">
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
