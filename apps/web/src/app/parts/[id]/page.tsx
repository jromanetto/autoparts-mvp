import { demoParts } from "@/lib/demo-data";
import PartDetailPage from "./part-detail";

export function generateStaticParams() {
  return demoParts.map((p) => ({ id: p.id }));
}

export default function Page() {
  return <PartDetailPage />;
}
