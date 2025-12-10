import type { Metadata, Viewport } from "next";
import { Nunito, Poppins } from 'next/font/google';
import "./globals.css";

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "Singapore MRT Food Finder",
  description: "Find delicious food near any MRT station in Singapore",
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
    <html lang="en" className={`${nunito.variable} ${poppins.variable}`}>
      <head>
        <link rel="icon" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
      </head>
      <body className={`antialiased ${nunito.className}`}>
        {children}
      </body>
    </html>
  );
}
