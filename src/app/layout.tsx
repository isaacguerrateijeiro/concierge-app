import type { Metadata } from "next";
import { DM_Serif_Display, DM_Mono, Inter } from "next/font/google";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ConciergeOS · Madrid",
  description: "Tu concierge digital en Madrid",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${dmSerifDisplay.variable} ${dmMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-black">{children}</body>
    </html>
  );
}
