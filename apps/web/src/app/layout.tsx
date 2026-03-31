import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AutoParts — Europe's Auto Parts Database",
  description:
    "Search across thousands of automotive spare parts with vehicle compatibility, cross-references, and manufacturer data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="border-t py-8">
          <div className="container text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} AutoParts. All rights reserved.</p>
            <p className="mt-1">
              Europe&apos;s largest automotive spare parts database.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
