import type { MetadataRoute } from "next";

// Makes the app installable: "Add to Home Screen" on iPhone, "Install app" on
// Android. It then opens full screen with its own icon, like a native app.
// No service worker needed - browsers no longer require one to install.
//
// Danish, as that's the app's default language. Colours match the dark theme
// so the splash screen and status bar blend in when the app opens.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rytmisk Farvelade",
    short_name: "Farvelade",
    description: "Medlemskab og booking af studie og scene i Rytmisk Farvelade Forening.",
    lang: "da",
    // Logged-in members land on their membership; anyone else is sent to log in.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops icons into its own shapes; this one keeps the logo
      // inside the safe zone so nothing gets cut off.
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
