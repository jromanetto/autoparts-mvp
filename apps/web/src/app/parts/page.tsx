import Link from "next/link";
import { Wrench, ChevronRight } from "lucide-react";
import { getParts, getCategories, getManufacturers } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Parts Catalog — AutoParts",
  description: "Browse automotive spare parts by manufacturer, category, and OEM number.",
};

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; categoryId?: string; manufacturerId?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  let partsData;
  let categoriesData;
  let manufacturersData;

  try {
    [partsData, categoriesData, manufacturersData] = await Promise.all([
      getParts({
        page,
        limit: 20,
        categoryId: params.categoryId,
        manufacturerId: params.manufacturerId,
        search: params.search,
      }),
      getCategories(),
      getManufacturers(),
    ]);
  } catch {
    return <PartsError />;
  }

  const parts = partsData.data;
  const categories = categoriesData.data;
  const manufacturers = manufacturersData.data;
  const pagination = partsData.pagination;

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
                <Button
                  variant={!params.categoryId ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                >
                  All Categories
                </Button>
              </Link>
              {categories.map((cat) => (
                <Link key={cat.id} href={`/parts?categoryId=${cat.id}`}>
                  <Button
                    variant={params.categoryId === cat.id ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                  >
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
                <Button
                  variant={!params.manufacturerId ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                >
                  All Manufacturers
                </Button>
              </Link>
              {manufacturers.map((mfr) => (
                <Link key={mfr.id} href={`/parts?manufacturerId=${mfr.id}`}>
                  <Button
                    variant={params.manufacturerId === mfr.id ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                  >
                    {mfr.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Parts grid */}
        <div>
          {parts.length === 0 ? (
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
                          <Badge
                            variant={part.status === "active" ? "default" : "secondary"}
                          >
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

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Link href={`/parts?page=${page - 1}${params.categoryId ? `&categoryId=${params.categoryId}` : ""}${params.manufacturerId ? `&manufacturerId=${params.manufacturerId}` : ""}`}>
                      <Button variant="outline" size="sm">Previous</Button>
                    </Link>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                  </span>
                  {page < pagination.totalPages && (
                    <Link href={`/parts?page=${page + 1}${params.categoryId ? `&categoryId=${params.categoryId}` : ""}${params.manufacturerId ? `&manufacturerId=${params.manufacturerId}` : ""}`}>
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

function PartsError() {
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-md text-center">
        <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Unable to load parts</h2>
        <p className="mt-2 text-muted-foreground">
          The API server may be offline. Make sure the backend is running on port 3000.
        </p>
      </div>
    </div>
  );
}
