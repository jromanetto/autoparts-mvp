"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronRight,
  Package,
  Copy,
  Check,
  Grid3x3,
  List,
  X,
  Car,
  LayoutGrid,
  SlidersHorizontal,
  SearchX,
} from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  demoParts,
  demoCategories,
  demoManufacturers,
} from "@/lib/demo-data";
import { staggerContainer, staggerItem, cardHover } from "@/lib/motion";
import type { SearchResult, Category, Manufacturer } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

interface PaginatedResult {
  data: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function searchDemo(
  q: string,
  page: number,
  limit: number,
  categoryId?: string,
  manufacturerId?: string
): PaginatedResult {
  const lower = q.toLowerCase();
  let filtered = demoParts.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.oemNumber.toLowerCase().includes(lower) ||
      (p.description && p.description.toLowerCase().includes(lower)) ||
      (p.manufacturerName &&
        p.manufacturerName.toLowerCase().includes(lower)) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(lower))
  );
  if (categoryId) filtered = filtered.filter((p) => p.categoryId === categoryId);
  if (manufacturerId)
    filtered = filtered.filter((p) => p.manufacturerId === manufacturerId);
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
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    },
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
      aria-label="Copy OEM number"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}

function FilterSidebar({
  categories,
  manufacturers,
  selectedCategory,
  selectedManufacturer,
  onCategoryChange,
  onManufacturerChange,
}: {
  categories: Category[];
  manufacturers: Manufacturer[];
  selectedCategory: string | undefined;
  selectedManufacturer: string | undefined;
  onCategoryChange: (id: string | undefined) => void;
  onManufacturerChange: (id: string | undefined) => void;
}) {
  const rootCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Category
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => onCategoryChange(undefined)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${
              !selectedCategory
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground hover:bg-muted"
            }`}
          >
            All Categories
          </button>
          {rootCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                onCategoryChange(
                  selectedCategory === cat.id ? undefined : cat.id
                )
              }
              className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${
                selectedCategory === cat.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Manufacturer
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => onManufacturerChange(undefined)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${
              !selectedManufacturer
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground hover:bg-muted"
            }`}
          >
            All Manufacturers
          </button>
          {manufacturers.map((mfr) => (
            <button
              key={mfr.id}
              onClick={() =>
                onManufacturerChange(
                  selectedManufacturer === mfr.id ? undefined : mfr.id
                )
              }
              className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${
                selectedManufacturer === mfr.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {mfr.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-16 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;
  const categoryParam = searchParams.get("category") || undefined;
  const manufacturerParam = searchParams.get("manufacturer") || undefined;
  const sortParam = searchParams.get("sort") || "relevance";
  const viewParam = (searchParams.get("view") || "grid") as "grid" | "list";

  const [results, setResults] = useState<PaginatedResult | null>(null);
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [manufacturers, setManufacturers] =
    useState<Manufacturer[]>(demoManufacturers);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"grid" | "list">(viewParam);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val) params.set(key, val);
        else params.delete(key);
      });
      // Reset page when filters change (unless explicitly setting page)
      if (!("page" in updates)) params.delete("page");
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router]
  );

  const doSearch = useCallback(async () => {
    if (!q) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const base = API_BASE || "http://localhost:3000";
      const url = new URL("/api/v1/search", base);
      url.searchParams.set("q", q);
      url.searchParams.set("type", "parts");
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", "20");
      if (categoryParam) url.searchParams.set("categoryId", categoryParam);
      if (manufacturerParam)
        url.searchParams.set("manufacturerId", manufacturerParam);
      if (sortParam && sortParam !== "relevance")
        url.searchParams.set("sort", sortParam);

      const headers = { "X-API-Key": API_KEY };
      const [searchRes, catsRes, mfrsRes] = await Promise.all([
        fetch(url.toString(), { headers }),
        fetch(
          new URL("/api/v1/categories?limit=100", base).toString(),
          { headers }
        ),
        fetch(
          new URL("/api/v1/manufacturers?limit=100", base).toString(),
          { headers }
        ),
      ]);
      if (!searchRes.ok) throw new Error("API error");
      setResults(await searchRes.json());
      if (catsRes.ok) {
        const cData = await catsRes.json();
        setCategories(cData.data || demoCategories);
      }
      if (mfrsRes.ok) {
        const mData = await mfrsRes.json();
        setManufacturers(mData.data || demoManufacturers);
      }
    } catch {
      setResults(searchDemo(q, page, 20, categoryParam, manufacturerParam));
      setCategories(demoCategories);
      setManufacturers(demoManufacturers);
    } finally {
      setLoading(false);
    }
  }, [q, page, categoryParam, manufacturerParam, sortParam]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  // Empty search state
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
            <SearchBar size="lg" autoFocus />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Popular:</span>
            {[
              "Brake pad",
              "Oil filter",
              "Spark plug",
              "0986494524",
              "Air filter",
              "Shock absorber",
            ].map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeFilterCount =
    (categoryParam ? 1 : 0) + (manufacturerParam ? 1 : 0);
  const selectedCategoryName = categories.find(
    (c) => c.id === categoryParam
  )?.name;
  const selectedManufacturerName = manufacturers.find(
    (m) => m.id === manufacturerParam
  )?.name;

  return (
    <div className="container py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/search">Search</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>&ldquo;{q}&rdquo;</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Sticky search bar */}
      <div className="sticky top-16 z-30 -mx-4 bg-background/80 backdrop-blur-sm border-b px-4 py-3 mb-6 lg:-mx-0 lg:px-0 lg:border-none lg:bg-transparent lg:backdrop-blur-none lg:relative lg:top-auto lg:z-auto">
        <div className="max-w-2xl">
          <SearchBar defaultValue={q} />
        </div>
      </div>

      {/* Filter chips + controls bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Mobile filter trigger */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-[10px] flex items-center justify-center rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterSidebar
                  categories={categories}
                  manufacturers={manufacturers}
                  selectedCategory={categoryParam}
                  selectedManufacturer={manufacturerParam}
                  onCategoryChange={(id) =>
                    updateParams({ category: id })
                  }
                  onManufacturerChange={(id) =>
                    updateParams({ manufacturer: id })
                  }
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active filter chips */}
        <AnimatePresence>
          {selectedCategoryName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Badge
                variant="secondary"
                className="gap-1 px-3 py-1.5 cursor-pointer"
                onClick={() => updateParams({ category: undefined })}
              >
                {selectedCategoryName}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            </motion.div>
          )}
          {selectedManufacturerName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Badge
                variant="secondary"
                className="gap-1 px-3 py-1.5 cursor-pointer"
                onClick={() => updateParams({ manufacturer: undefined })}
              >
                {selectedManufacturerName}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1" />

        {/* Result count */}
        {results && !loading && (
          <span className="text-sm text-muted-foreground">
            {results.pagination.total} result
            {results.pagination.total !== 1 ? "s" : ""}
          </span>
        )}

        {/* Sort */}
        <Select
          value={sortParam}
          onValueChange={(val) => updateParams({ sort: val })}
        >
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="name">Name A→Z</SelectItem>
            <SelectItem value="-name">Name Z→A</SelectItem>
            <SelectItem value="oem">OEM Number</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="hidden sm:flex items-center border rounded-md">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`p-1.5 rounded-l-md transition-colors ${
              view === "grid"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            aria-label="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`p-1.5 rounded-r-md transition-colors ${
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block sticky top-32 self-start">
          <FilterSidebar
            categories={categories}
            manufacturers={manufacturers}
            selectedCategory={categoryParam}
            selectedManufacturer={manufacturerParam}
            onCategoryChange={(id) => updateParams({ category: id })}
            onManufacturerChange={(id) =>
              updateParams({ manufacturer: id })
            }
          />
        </aside>

        {/* Results area */}
        <div>
          {loading ? (
            <div
              className={
                view === "grid"
                  ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : "space-y-3"
              }
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  shimmer
                  className={
                    view === "grid" ? "h-52 rounded-lg" : "h-24 rounded-lg"
                  }
                />
              ))}
            </div>
          ) : !results || results.data.length === 0 ? (
            /* Zero results state */
            <div className="text-center py-16">
              <SearchX className="mx-auto h-16 w-16 text-muted-foreground/30" />
              <h2 className="mt-4 text-xl font-semibold">
                No results for &ldquo;{q}&rdquo;
              </h2>
              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>Check spelling or try different keywords</p>
                <p>Try a shorter search term</p>
                <p>Use the full OEM reference number</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Link href="/vehicles">
                  <Button variant="default" className="gap-2">
                    <Car className="h-4 w-4" />
                    Search by vehicle
                  </Button>
                </Link>
                <Link href="/categories">
                  <Button variant="outline" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Browse categories
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {view === "grid" ? (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {results.data.map((part) => (
                    <motion.div
                      key={part.id}
                      variants={staggerItem}
                      {...cardHover}
                    >
                      <Link href={`/parts/${part.id}`}>
                        <Card className="group h-full cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30">
                          {/* Image placeholder */}
                          <div className="aspect-[16/10] bg-muted flex items-center justify-center">
                            <Package className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                          <CardContent className="p-4">
                            {part.categoryName && (
                              <Badge
                                variant="outline"
                                className="mb-2 text-xs border-primary/20 text-primary"
                              >
                                {part.categoryName}
                              </Badge>
                            )}
                            <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                              {part.name}
                            </h3>
                            <div className="mt-2 flex items-center gap-2">
                              <code className="font-mono text-sm tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {part.oemNumber}
                              </code>
                              <CopyButton text={part.oemNumber} />
                            </div>
                            <div className="mt-3 pt-3 border-t flex items-center justify-between">
                              {part.manufacturerName && (
                                <span className="text-sm text-muted-foreground">
                                  {part.manufacturerName}
                                </span>
                              )}
                              <Badge
                                variant={
                                  part.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                                className={`text-xs ${
                                  part.status === "active"
                                    ? "bg-green-600/10 text-green-700 border-green-600/20 dark:text-green-400"
                                    : ""
                                }`}
                              >
                                {part.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-3"
                >
                  {results.data.map((part) => (
                    <motion.div key={part.id} variants={staggerItem}>
                      <Link href={`/parts/${part.id}`}>
                        <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                          <CardContent className="flex gap-4 p-4 items-start">
                            {/* Image placeholder */}
                            <div className="hidden sm:flex w-20 h-20 rounded-lg bg-muted items-center justify-center shrink-0">
                              <Package className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono tracking-wider">
                                  {part.oemNumber}
                                </code>
                                <CopyButton text={part.oemNumber} />
                                <Badge
                                  variant={
                                    part.status === "active"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className={`text-xs ${
                                    part.status === "active"
                                      ? "bg-green-600/10 text-green-700 border-green-600/20 dark:text-green-400"
                                      : ""
                                  }`}
                                >
                                  {part.status}
                                </Badge>
                              </div>
                              <h3 className="mt-2 font-semibold group-hover:text-primary transition-colors">
                                {part.name}
                              </h3>
                              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                {part.manufacturerName && (
                                  <span>{part.manufacturerName}</span>
                                )}
                                {part.categoryName && (
                                  <>
                                    <span>·</span>
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
                            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 hidden sm:block" />
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Pagination */}
              {results.pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-1">
                  {page > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateParams({ page: String(page - 1) })
                      }
                    >
                      Previous
                    </Button>
                  )}
                  {Array.from(
                    { length: Math.min(results.pagination.totalPages, 5) },
                    (_, i) => {
                      const p = i + 1;
                      return (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "ghost"}
                          size="sm"
                          className="w-9"
                          onClick={() =>
                            updateParams({ page: String(p) })
                          }
                        >
                          {p}
                        </Button>
                      );
                    }
                  )}
                  {results.pagination.totalPages > 5 && (
                    <span className="text-muted-foreground px-2">...</span>
                  )}
                  {page < results.pagination.totalPages && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateParams({ page: String(page + 1) })
                      }
                    >
                      Next
                    </Button>
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
