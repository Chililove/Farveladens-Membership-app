import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/app/components/ThemeToggle";
import PaintSplashes from "@/app/components/PaintSplashes";
import Logo from "@/app/components/Logo";
import LanguageSwitch from "@/app/components/LanguageSwitch";
import { getI18n } from "@/lib/i18n/server";

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

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.meta.title,
    description: t.meta.description,
    // iPhone doesn't read the manifest's icons and display mode, so it gets
    // its own: an icon for the home screen, and full screen when opened from
    // there.
    appleWebApp: {
      capable: true,
      title: "Farvelade",
      statusBarStyle: "black",
    },
    icons: { apple: "/apple-touch-icon.png" },
  };
}

// Colours the phone's status bar and browser bar to match the dark theme.
export const viewport: Viewport = {
  themeColor: "#0a0a0c",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { lang, t } = await getI18n();

  return (
    <html
      lang={lang}
      className={`dark ${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-[#fbf6ec] text-gray-900 dark:bg-[#0a0a0c] dark:text-gray-100">
        <PaintSplashes />
        {/* Header like the forening's website: logo left, language and theme
            switches right. */}
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 pt-6">
          <Logo label={t.header.logoLabel} />
          <div className="flex items-center gap-2">
            <LanguageSwitch lang={lang} label={t.header.language} />
            <ThemeToggle
              labels={{
                toLight: t.header.toLight,
                toLightTitle: t.header.toLightTitle,
                toDark: t.header.toDark,
              }}
            />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
