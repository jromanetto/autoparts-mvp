import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalogue de pièces auto",
  description:
    "Parcourez notre catalogue de pièces détachées automobiles. Filtrez par catégorie et fabricant. Bosch, Brembo, Valeo, Mann-Filter et plus.",
  alternates: {
    canonical: "/parts",
  },
  openGraph: {
    title: "Catalogue de pièces auto | AutoParts",
    description:
      "Plus de 10 000 pièces auto de 70+ fabricants européens et mondiaux.",
  },
};

export default function PartsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
