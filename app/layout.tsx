import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { CommandPalette, CommandPaletteTrigger } from "@/components/CommandPalette";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FleetHappens — Fleet Route Intelligence",
  description:
    "Turn raw Geotab fleet data into contextual area briefings and comic-style trip recaps.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
        <div className="min-h-screen bg-[#09090e]">
          {children}
          {/* Global command palette — Cmd+K from any page */}
          <Suspense fallback={null}>
            <CommandPalette />
            <CommandPaletteTrigger />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
