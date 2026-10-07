import type { Metadata } from "next";
import { IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });
const plex = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-plex", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Jyotish Protocol",
  description: "Staged Jyotish natal analysis with a blind past-check and a living protocol.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plex.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
