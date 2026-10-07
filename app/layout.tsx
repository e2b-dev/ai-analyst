import "./globals.css";
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Analyst by E2B",
  description: "Analyze your data with AI-generated Python in an E2B sandbox.",
  icons: {
    icon: [
      { url: "/favicon-light.ico", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.ico", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} scrollbar-track-transparent scrollbar-thumb-foreground/10`}
    >
      {process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      )}
      <body>{children}</body>
    </html>
  );
}
