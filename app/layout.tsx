import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "Singapore MRT Food Finder",
  description: "Find delicious food near any MRT station in Singapore. Discover hawker stalls, restaurants, and cafes recommended by Michelin, food blogs, and local guides.",
  keywords: ["Singapore", "MRT", "food", "hawker", "restaurant", "Michelin", "food guide"],
  authors: [{ name: "MRT Foodie" }],
  openGraph: {
    title: "Singapore MRT Food Finder",
    description: "Find delicious food near any MRT station in Singapore",
    type: "website",
    locale: "en_SG",
    siteName: "MRT Foodie",
  },
  twitter: {
    card: "summary_large_image",
    title: "Singapore MRT Food Finder",
    description: "Find delicious food near any MRT station in Singapore",
  },
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
