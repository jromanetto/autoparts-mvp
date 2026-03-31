"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wrench, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { demoParts, demoCategories, demoManufacturers } from "@/lib/demo-data";
import type { PartWithRelations, Category, Manufacturer } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function getDemoParts(page: number, categoryId?: string, manufacturerId?: string): PaginatedResponse<PartWithRelations> {
  let filtered = demoParts;
  if (categoryId) filtered = filtered.filter((p) => p.categoryId === categoryId);
  if (manufacturerId) filtered = filtered.filter((p) => p.manufacturerId === manufacturerId);
  const limit = 20;
  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit),
    pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) || 1 },
  };
}

export default function PartsPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center"><Wrench className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" /></div>}>
      <PartsPageContent />
    </Suspense>
  );
}

function PartsPageContent() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const categoryId = searchParams.get("categoryId") || undefined;
  const manufacturerId = searchParams.get("manufacturerId") || undefined;

  const [parts, setParts] = useState<PartWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(demoManufacturers);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const base = API_BASE || "http://localhost:3000";
      const partsUrl = new URL("/api/v1/parts", base);
      partsUrl.searchParams.set("page", String(page));
      partsUrl.searchParams.set("limit", "20");
      if (categoryId) partsUrl.searchParams.set("categoryId", categoryId);
      if (manufacturerId) partsUrl.searchParams.set("manufacturerId", manufacturerId);

      const headers = { "X-API-Key": API_KEY };
      const [partsRes, catsRes, mfrsRes] = await Promise.all([
        fetch(partsUrl.toString(), { headers }),
        fetch(new URL("/api/v1/categories?limit=100", base).toString(), { headers }),
        fetch(new URL("/api/v1/manufacturers?limit=100", base).toString(), { headers }),
      ]);
      if (!partsRes.ok) throw new Error("API error");
      const partsData = await partsRes.json();
      const catsData = catsRes.ok ? await catsRes.json() : { data: demoCategories };
      const mfrsData = mfrsRes.ok ? await mfrsRes.json() : { data: demoManufacturers };
      setParts(partsData.data);
      setPagination(partsData.pagination);
      setCategories(catsData.data);
      setManufacturers(mfrsData.data);
    } catch {
      const demo = getDemoParts(page, categoryId, manufacturerId);
      setParts(demo.data);
      setPagination(demo.pagination);
      setCategories(demoCategories);
      setManufacturers(demoManufacturers);
    } finally {
      setLoading(false);
    }
  }, [page, categoryId, manufacturerId]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Parts Catalog</h1>
        <p className="mt-2 text-muted-foreground">
          Browse {pagination.total} parts across all manufacturers and categories.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar filters */}
        <aside className="space-y-6">
          <div>
            <h3 className="mb-3 font-semibold">Categories</h3>
            <div className="space-y-1">
              <Link href="/parts">
                <Button variant={!categoryId ? "secondary" : "ghost"} size="sm" className="w-full justify-start">
                  All Categories
                </Button>
              </Link>
              {categories.filter((c) => !c.parentId).map((cat) => (
                <Link key={cat.id} href={`/parts?categoryId=${cat.id}`}>
                  <Button variant={categoryId === cat.id ? "secondary" : "ghost"} size="sm" className="w-full justify-start">
                    {cat.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Manufacturers</h3>
            <div className="space-y-1">
              <Link href="/parts">
                <Button variant={!manufacturerId ? "secondary" : "ghost"} size="sm" className="w-full justify-start">
                  All Manufacturers
                </Button>
              </Link>
              {manufacturers.map((mfr) => (
                <Link key={mfr.id} href={`/parts?manufacturerId=${mfr.id}`}>
                  <Button variant={manufacturerId === mfr.id ? "secondary" : "ghost"} size="sm" className="w-full justify-start">
                    {mfr.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Parts grid */}
        <div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : parts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <Wrench className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No parts found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your filters or search terms.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {parts.map((part) => (
                  <Link key={part.id} href={`/parts/${part.id}`}>
                    <Card className="group h-full cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono text-muted-foreground">
                              {part.oemNumber}
                            </p>
                            <h3 className="mt-1 font-semibold leading-tight group-hover:text-primary">
                              {part.name}
                            </h3>
                            {part.manufacturerName && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {part.manufacturerName}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant={part.status === "active" ? "default" : "secondary"}>
                            {part.status}
                          </Badge>
                          {part.categoryName && (
                            <Badge variant="outline">{part.categoryName}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Link href={`/parts?page=${page - 1}${categoryId ? `&categoryId=${categoryId}` : ""}${manufacturerId ? `&manufacturerId=${manufacturerId}` : ""}`}>
                      <Button variant="outline" size="sm">Previous</Button>
                    </Link>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                  </span>
                  {page < pagination.totalPages && (
                    <Link href={`/parts?page=${page + 1}${categoryId ? `&categoryId=${categoryId}` : ""}${manufacturerId ? `&manufacturerId=${manufacturerId}` : ""}`}>
                      <Button variant="outline" size="sm">Next</Button>
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
