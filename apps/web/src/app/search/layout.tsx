import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recherche de pièces auto",
  description:
    "Recherchez des pièces détachées automobiles par référence OEM, nom, fabricant ou véhicule compatible. Filtrez par catégorie et fabricant.",
  alternates: {
    canonical: "/search",
  },
  openGraph: {
    title: "Recherche de pièces auto | AutoParts",
    description:
      "Trouvez la pièce auto qu'il vous faut parmi 10 000+ références.",
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
