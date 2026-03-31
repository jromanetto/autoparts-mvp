import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { searchParts } from "@/lib/api";
import { SearchBar } from "@/components/search-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Search — AutoParts",
  description: "Search automotive parts by OEM number, name, or description.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || "";
  const page = Number(params.page) || 1;

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

  let results;
  try {
    results = await searchParts(q, { page, limit: 20 });
  } catch {
    return (
      <div className="container py-8">
        <div className="mb-8 max-w-2xl">
          <SearchBar defaultValue={q} />
        </div>
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Search unavailable</h2>
          <p className="mt-2 text-muted-foreground">
            The API server may be offline. Make sure the backend is running.
          </p>
        </div>
      </div>
    );
  }

  const { data: parts, pagination } = results;

  return (
    <div className="container py-8">
      <div className="mb-8 max-w-2xl">
        <SearchBar defaultValue={q} />
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        {pagination.total} result{pagination.total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
      </p>

      {parts.length === 0 ? (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No results found</h2>
          <p className="mt-2 text-muted-foreground">
            Try different keywords or check the OEM number format.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {parts.map((part) => (
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}>
                  <Button variant="outline" size="sm">Previous</Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              {page < pagination.totalPages && (
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
