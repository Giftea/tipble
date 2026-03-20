import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import NavbarStatus from "@/components/NavbarStatus";
import TabNav from "@/components/TabNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tipble 🦞",
  description: "Autonomous tipping agent dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-zinc-950 text-white min-h-screen">
        {/* Shared navbar */}
        <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
          <span className="text-white font-bold text-xl">🦞 Tipble</span>
          <NavbarStatus />
        </header>

        {/* Tab navigation */}
        <div className="bg-zinc-900 border-b border-zinc-800">
          <TabNav />
        </div>

        {children}
        <Toaster />
      </body>
    </html>
  );
}
