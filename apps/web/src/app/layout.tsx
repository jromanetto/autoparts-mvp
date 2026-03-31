import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
