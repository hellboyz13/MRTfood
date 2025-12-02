import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Singapore MRT Food Finder",
  description: "Find delicious food near any MRT station in Singapore",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
