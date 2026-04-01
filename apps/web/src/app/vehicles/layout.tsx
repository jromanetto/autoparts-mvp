import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recherche par véhicule",
  description:
    "Trouvez les pièces compatibles avec votre véhicule. Sélectionnez marque, modèle et motorisation pour voir les pièces adaptées.",
  alternates: {
    canonical: "/vehicles",
  },
  openGraph: {
    title: "Recherche par véhicule | AutoParts",
    description:
      "Peugeot, Renault, Volkswagen, BMW, Mercedes et plus. Trouvez les pièces pour votre voiture.",
  },
};

export default function VehiclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
