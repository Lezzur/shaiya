import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "NEXUS - Content Agency Platform",
    template: "%s | NEXUS",
  },
  description: "Unified platform for content agency operations",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "NEXUS - Content Agency Platform",
    description: "Unified platform for content agency operations",
    type: "website",
    siteName: "NEXUS",
  },
  twitter: {
    card: "summary",
    title: "NEXUS - Content Agency Platform",
    description: "Unified platform for content agency operations",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
