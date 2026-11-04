import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({ subsets: ["latin"], display: "swap" });
import "./globals.css";

export const metadata: Metadata = {
  title: "Cashflow",
  description: "Personal cash-flow manager",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#1e1e57" />
      </head>
      <body className={dmSans.className}>{children}</body>
    </html>
  );
}
