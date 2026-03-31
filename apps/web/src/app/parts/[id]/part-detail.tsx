"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Package, Car, Hash, Tag, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { demoParts, demoCrossRefs } from "@/lib/demo-data";
import type { Part, CrossReference } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

type PartDetail = Part & { crossReferences?: CrossReference[]; manufacturer?: { name: string }; category?: { name: string } };

interface CompatEntry {
  id: string;
  vehicleMake?: string;
  vehicleModel?: string;
  yearStart?: number;
  yearEnd?: number;
  fitmentNotes?: string | null;
  quantityNeeded?: number | null;
  position?: string | null;
  verified?: boolean;
}

export default function PartDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [part, setPart] = useState<PartDetail | null>(null);
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
  const [compatibility, setCompatibility] = useState<CompatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const base = API_BASE || "http://localhost:3000";
        const headers = { "X-API-Key": API_KEY };
        const [partRes, xrefRes, compatRes] = await Promise.all([
          fetch(new URL(`/api/v1/parts/${id}`, base).toString(), { headers }),
          fetch(new URL(`/api/v1/parts/${id}/cross-references`, base).toString(), { headers }).catch(() => null),
          fetch(new URL(`/api/v1/compatibility?partId=${id}&limit=100`, base).toString(), { headers }).catch(() => null),
        ]);
        if (!partRes.ok) throw new Error("Not found");
        setPart(await partRes.json());
        if (xrefRes?.ok) setCrossRefs(await xrefRes.json());
        if (compatRes?.ok) { const d = await compatRes.json(); setCompatibility(d.data || []); }
      } catch {
        // Fallback to demo data
        const demoPart = demoParts.find((p) => p.id === id);
        if (demoPart) {
          setPart({
            ...demoPart,
            manufacturer: demoPart.manufacturerName ? { name: demoPart.manufacturerName } : undefined,
            category: demoPart.categoryName ? { name: demoPart.categoryName } : undefined,
          });
          setCrossRefs(demoCrossRefs.filter((x) => x.partId === id));
        } else {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !part) {
    return (
      <div className="container py-16 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Part not found</h2>
        <Link href="/parts">
          <Button variant="outline" className="mt-4">Back to catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Link href="/parts">
        <Button variant="ghost" size="sm" className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to catalog
        </Button>
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main content */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <Badge variant={part.status === "active" ? "default" : "secondary"}>
                {part.status}
              </Badge>
              {part.category?.name && (
                <Badge variant="outline">{part.category.name}</Badge>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold">{part.name}</h1>
            {part.manufacturer?.name && (
              <p className="mt-1 text-lg text-muted-foreground">
                by {part.manufacturer.name}
              </p>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hash className="h-5 w-5" /> OEM Number
              </CardTitle>
            </CardHeader>
            <CardContent>
              <code className="rounded bg-muted px-3 py-2 text-lg font-mono font-semibold">
                {part.oemNumber}
              </code>
            </CardContent>
          </Card>

          {part.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" /> Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{part.description}</p>
              </CardContent>
            </Card>
          )}

          {crossRefs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="h-5 w-5" /> Cross References ({crossRefs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {crossRefs.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between py-3">
                      <div>
                        <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-medium">
                          {ref.crossRefOemNumber}
                        </code>
                        {ref.crossRefManufacturer && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            {ref.crossRefManufacturer}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline">{ref.crossRefType}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {compatibility.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Car className="h-5 w-5" /> Compatible Vehicles ({compatibility.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {compatibility.map((compat) => (
                    <div key={compat.id} className="py-3">
                      <div className="flex items-center gap-2">
                        {compat.vehicleMake && compat.vehicleModel && (
                          <span className="font-medium">
                            {compat.vehicleMake} {compat.vehicleModel}
                          </span>
                        )}
                        {compat.yearStart && (
                          <span className="text-sm text-muted-foreground">
                            ({compat.yearStart}{compat.yearEnd ? `–${compat.yearEnd}` : "+"})
                          </span>
                        )}
                        {compat.verified && (
                          <Badge variant="default" className="text-xs">Verified</Badge>
                        )}
                      </div>
                      {compat.fitmentNotes && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {compat.fitmentNotes}
                        </p>
                      )}
                      <div className="mt-1 flex gap-2">
                        {compat.position && (
                          <Badge variant="outline" className="text-xs">
                            Position: {compat.position}
                          </Badge>
                        )}
                        {compat.quantityNeeded && (
                          <Badge variant="outline" className="text-xs">
                            Qty: {compat.quantityNeeded}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Facts</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">OEM Number</dt>
                  <dd className="font-mono font-medium">{part.oemNumber}</dd>
                </div>
                {part.manufacturer?.name && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Manufacturer</dt>
                    <dd className="font-medium">{part.manufacturer.name}</dd>
                  </div>
                )}
                {part.category?.name && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Category</dt>
                    <dd className="font-medium">{part.category.name}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant={part.status === "active" ? "default" : "secondary"}>
                      {part.status}
                    </Badge>
                  </dd>
                </div>
                {part.weightGrams && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Weight</dt>
                    <dd className="font-medium">{part.weightGrams}g</dd>
                  </div>
                )}
                {part.dimensions && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Dimensions</dt>
                    <dd className="font-medium text-sm">
                      {part.dimensions.lengthMm && `${part.dimensions.lengthMm}mm`}
                      {part.dimensions.widthMm && ` × ${part.dimensions.widthMm}mm`}
                      {part.dimensions.heightMm && ` × ${part.dimensions.heightMm}mm`}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {part.specifications && Object.keys(part.specifications).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {Object.entries(part.specifications).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">{key}</dt>
                      <dd className="font-medium text-sm">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
