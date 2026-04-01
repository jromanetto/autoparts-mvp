import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "AutoParts — Pièces détachées automobiles en Europe",
    template: "%s | AutoParts",
  },
  description:
    "Recherchez parmi des milliers de pièces détachées automobiles avec compatibilité véhicule, références croisées et données fabricant. La plus grande base de données de pièces auto en Europe.",
  keywords: [
    "pièces détachées auto",
    "pièces automobiles",
    "compatibilité véhicule",
    "référence OEM",
    "plaquettes de frein",
    "filtre huile",
    "pièces auto Europe",
    "cross-reference",
    "aftermarket parts",
  ],
  authors: [{ name: "AutoParts" }],
  creator: "AutoParts",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://autoparts.example.com"
  ),
  alternates: {
    canonical: "/",
    languages: {
      "fr-FR": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "AutoParts",
    title: "AutoParts — Pièces détachées automobiles en Europe",
    description:
      "Recherchez parmi des milliers de pièces détachées automobiles avec compatibilité véhicule, références croisées et données fabricant.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoParts — Pièces détachées automobiles",
    description:
      "La plus grande base de données de pièces auto en Europe. 10 000+ pièces, 70+ fabricants.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="alternate" hrefLang="fr-FR" href="/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "AutoPartsStore",
              name: "AutoParts",
              description:
                "La plus grande base de données de pièces détachées automobiles en Europe",
              url: process.env.NEXT_PUBLIC_SITE_URL || "https://autoparts.example.com",
              areaServed: {
                "@type": "GeoCircle",
                geoMidpoint: {
                  "@type": "GeoCoordinates",
                  latitude: 48.8566,
                  longitude: 2.3522,
                },
                geoRadius: "2000000",
              },
              inLanguage: "fr",
              numberOfItems: 10500,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || "https://autoparts.example.com"}/search?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <footer className="border-t py-8">
            <div className="container text-center text-sm text-muted-foreground">
              <p>
                © {new Date().getFullYear()} AutoParts. Tous droits réservés.
              </p>
              <p className="mt-1">
                La plus grande base de données de pièces auto en Europe.
              </p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
