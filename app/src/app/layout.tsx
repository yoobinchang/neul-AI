import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neul — Caregiver Space",
  description: "Neul caregiver frontend prototype (sample data only).",
  applicationName: "Neul",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/neul-icon.svg", apple: "/neul-icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f8f4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
