import type { Metadata } from "next";
import { demoParts } from "@/lib/demo-data";
import PartDetailPage from "./part-detail";

export function generateStaticParams() {
  return demoParts.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const part = demoParts.find((p) => p.id === id);

  if (!part) {
    return { title: "Part Not Found" };
  }

  const title = `${part.name} — ${part.oemNumber}`;
  const description = part.description
    ? `${part.description}. ${part.manufacturerName || ""} ${part.categoryName || ""}. Référence OEM: ${part.oemNumber}`
    : `${part.name} par ${part.manufacturerName || ""}. Référence OEM: ${part.oemNumber}. Trouvez la compatibilité véhicule et les références croisées.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fr_FR",
    },
    alternates: {
      canonical: `/parts/${id}`,
    },
  };
}

export default function Page() {
  return <PartDetailPage />;
}
