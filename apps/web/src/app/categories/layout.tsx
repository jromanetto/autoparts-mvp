import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catégories de pièces auto",
  description:
    "Parcourez les pièces auto par catégorie : freinage, moteur, filtres, électricité, suspension, transmission, éclairage et plus.",
  openGraph: {
    title: "Catégories de pièces auto | AutoParts",
    description:
      "Toutes les catégories de pièces détachées automobiles en un coup d'œil.",
  },
};

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
