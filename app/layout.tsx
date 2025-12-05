import type { Metadata } from "next";
import "./globals.css";

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
