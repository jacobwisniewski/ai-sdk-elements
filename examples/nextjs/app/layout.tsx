import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ai-sdk-elements - Weather Demo",
  description:
    "Example Next.js app using ai-sdk-elements for inline weather cards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
