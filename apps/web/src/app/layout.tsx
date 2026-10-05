import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DataFlow",
  description: "Map your infrastructure. Together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`}>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
