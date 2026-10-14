import type { Metadata, Viewport } from "next";
import { DM_Sans, Oswald } from "next/font/google";
import { ModeBanner } from "@/components/ModeBanner";
import "./globals.css";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Oswald({
  subsets: ["latin"],
  variable: "--font-display",
});

export const viewport: Viewport = {
  themeColor: "#111111",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:38471"),
  title: {
    default: "Black Flag Warriors · Player payments",
    template: "%s · Black Flag Warriors",
  },
  description:
    "Private player payments portal for Black Flag Warriors, Sunday football in Manchester.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className={`${body.variable} ${display.variable} bg-pitch text-paper antialiased`}>
        <a
          href="#main-content"
          className="absolute -top-12 left-4 z-50 rounded-md bg-paper px-4 py-2 text-ink focus:top-4"
        >
          Skip to main content
        </a>
        <ModeBanner />
        {children}
      </body>
    </html>
  );
}
