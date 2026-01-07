import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Vigo Coffee - Loyalty Program",
  description: "Join the Vigo Coffee loyalty program and earn rewards with every purchase",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "any" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/icon.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Vigo Coffee - Loyalty Program",
    description: "Join the Vigo Coffee loyalty program and earn rewards with every purchase",
    images: [
      {
        url: "/assets/vigo-banner.png",
        width: 1200,
        height: 630,
        alt: "Vigo Coffee Loyalty Program",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vigo Coffee - Loyalty Program",
    description: "Join the Vigo Coffee loyalty program and earn rewards with every purchase",
    images: ["/assets/vigo-banner.png"],
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <Toaster />
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
