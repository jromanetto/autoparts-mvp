"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, ChevronRight } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { demoParts } from "@/lib/demo-data";
import type { SearchResult } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

interface PaginatedResult {
  data: SearchResult[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function searchDemo(q: string, page: number, limit: number): PaginatedResult {
  const lower = q.toLowerCase();
  const filtered = demoParts.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.oemNumber.toLowerCase().includes(lower) ||
      (p.description && p.description.toLowerCase().includes(lower)) ||
      (p.manufacturerName && p.manufacturerName.toLowerCase().includes(lower)) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(lower)),
  );
  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit).map((p) => ({
      id: p.id,
      oemNumber: p.oemNumber,
      name: p.name,
      description: p.description,
      status: p.status,
      manufacturerName: p.manufacturerName,
      categoryName: p.categoryName,
    })),
    pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) || 1 },
  };
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center"><Search className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" /></div>}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;
  const [results, setResults] = useState<PaginatedResult | null>(null);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async () => {
    if (!q) { setResults(null); return; }
    setLoading(true);
    try {
      const base = API_BASE || "http://localhost:3000";
      const url = new URL(`/api/v1/search`, base);
      url.searchParams.set("q", q);
      url.searchParams.set("type", "parts");
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", "20");
      const res = await fetch(url.toString(), { headers: { "X-API-Key": API_KEY } });
      if (!res.ok) throw new Error("API error");
      setResults(await res.json());
    } catch {
      setResults(searchDemo(q, page, 20));
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => { doSearch(); }, [doSearch]);

  if (!q) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-3xl font-bold">Search Parts</h1>
          <p className="mt-2 text-muted-foreground">
            Search by OEM number, part name, manufacturer, or description.
          </p>
          <div className="mt-8">
            <SearchBar size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 max-w-2xl">
        <SearchBar defaultValue={q} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : !results || results.data.length === 0 ? (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No results found</h2>
          <p className="mt-2 text-muted-foreground">
            Try different keywords or check the OEM number format.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            {results.pagination.total} result{results.pagination.total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
          </p>

          <div className="space-y-3">
            {results.data.map((part) => (
              <Link key={part.id} href={`/parts/${part.id}`}>
                <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono">
                            {part.oemNumber}
                          </code>
                          <Badge
                            variant={part.status === "active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {part.status}
                          </Badge>
                        </div>
                        <h3 className="mt-2 font-semibold group-hover:text-primary">
                          {part.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                          {part.manufacturerName && <span>{part.manufacturerName}</span>}
                          {part.categoryName && (
                            <>
                              <span>•</span>
                              <span>{part.categoryName}</span>
                            </>
                          )}
                        </div>
                        {part.description && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {part.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {results.pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}>
                  <Button variant="outline" size="sm">Previous</Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {results.pagination.totalPages}
              </span>
              {page < results.pagination.totalPages && (
                <Link href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}>
                  <Button variant="outline" size="sm">Next</Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
