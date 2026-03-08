import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthHydrate } from "@/components/AuthHydrate";
import { HydrationGate } from "@/components/HydrationGate";
import { LevelUpToast } from "@/components/LevelUpToast";
import { Toast } from "@/components/Toast";
import { IntroAnimation } from "@/components/IntroAnimation";
import { SiteFooter } from "@/components/SiteFooter";
import { QueryProvider } from "@/components/QueryProvider";
import { Analytics } from "@vercel/analytics/next";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scriptify — The Script. The Source. The Scene.",
  description:
    "A free Roblox Lua script sharing platform. Community uploads scripts. All scripts are free.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-page font-sans text-primary antialiased">
        <MotionConfig reducedMotion="user">
          <QueryProvider>
          <IntroAnimation />
          <AuthHydrate />
          <HydrationGate>
            <Navbar />
            <div className="min-h-[calc(100vh-56px)] max-w-[1200px] mx-auto flex flex-col px-5">
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
            <LevelUpToast />
            <Toast />
          </HydrationGate>
          </QueryProvider>
        </MotionConfig>
        <Analytics />
      </body>
    </html>
  );
}
