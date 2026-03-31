"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Car, LayoutGrid, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { demoParts, demoCategories, demoMakes, demoModels } from "@/lib/demo-data";
import type { SearchResult } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

interface Suggestion {
  type: "part" | "vehicle" | "category";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

function searchDemoSuggestions(q: string): Suggestion[] {
  const lower = q.toLowerCase();
  const results: Suggestion[] = [];

  // Search parts
  demoParts
    .filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.oemNumber.toLowerCase().includes(lower)
    )
    .slice(0, 4)
    .forEach((p) =>
      results.push({
        type: "part",
        id: p.id,
        title: p.name,
        subtitle: p.oemNumber,
        href: `/parts/${p.id}`,
      })
    );

  // Search categories
  demoCategories
    .filter((c) => c.name.toLowerCase().includes(lower))
    .slice(0, 2)
    .forEach((c) =>
      results.push({
        type: "category",
        id: c.id,
        title: c.name,
        subtitle: c.description || undefined,
        href: `/parts?categoryId=${c.id}`,
      })
    );

  // Search vehicles (makes + models)
  demoMakes
    .filter((m) => m.name.toLowerCase().includes(lower))
    .slice(0, 2)
    .forEach((m) => {
      const models = demoModels.filter((mod) => mod.makeId === m.id);
      results.push({
        type: "vehicle",
        id: m.id,
        title: m.name,
        subtitle: models.map((mod) => mod.name).join(", ") || m.country || undefined,
        href: `/vehicles`,
      });
    });

  return results.slice(0, 8);
}

export function SearchBar({
  defaultValue = "",
  placeholder = "Search by part name, OEM number, or vehicle...",
  size = "default",
  autoFocus = false,
}: {
  defaultValue?: string;
  placeholder?: string;
  size?: "default" | "lg";
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setShowSuggestions(false);
      if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const base = API_BASE || "http://localhost:3000";
      const url = new URL("/api/v1/search", base);
      url.searchParams.set("q", q);
      url.searchParams.set("type", "parts");
      url.searchParams.set("limit", "5");
      const res = await fetch(url.toString(), {
        headers: { "X-API-Key": API_KEY },
      });
      if (!res.ok) throw new Error("API error");
      const data: { data: SearchResult[] } = await res.json();
      const apiSuggestions: Suggestion[] = data.data.map((p) => ({
        type: "part" as const,
        id: p.id,
        title: p.name,
        subtitle: p.oemNumber,
        href: `/parts/${p.id}`,
      }));
      setSuggestions(apiSuggestions);
    } catch {
      setSuggestions(searchDemoSuggestions(q));
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      setSelectedIndex(-1);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);

      if (val.length >= 2) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    },
    [fetchSuggestions]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        setShowSuggestions(false);
        router.push(selected.href);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, suggestions, selectedIndex, router]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: Suggestion) => {
      setShowSuggestions(false);
      router.push(suggestion.href);
    },
    [router]
  );

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLarge = size === "lg";
  const typeIcon = {
    part: Package,
    vehicle: Car,
    category: LayoutGrid,
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="flex w-full gap-2">
        <div className="relative flex-1">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${isLarge ? "h-5 w-5" : "h-4 w-4"}`}
          />
          <Input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.length >= 2 && suggestions.length > 0)
                setShowSuggestions(true);
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`${isLarge ? "h-14 pl-11 text-lg" : "h-10 pl-9"}`}
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          size={isLarge ? "lg" : "default"}
          className={isLarge ? "h-14 px-8" : ""}
        >
          Search
        </Button>
      </form>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-popover shadow-2xl"
          >
            <div className="max-h-[320px] overflow-y-auto py-2">
              {suggestions.map((suggestion, idx) => {
                const Icon = typeIcon[suggestion.type];
                return (
                  <button
                    key={`${suggestion.type}-${suggestion.id}`}
                    type="button"
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      idx === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    }`}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {suggestion.title}
                      </div>
                      {suggestion.subtitle && (
                        <div className="text-xs text-muted-foreground font-mono tracking-wider truncate">
                          {suggestion.subtitle}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] shrink-0 capitalize"
                    >
                      {suggestion.type === "part"
                        ? "Part"
                        : suggestion.type === "vehicle"
                          ? "Vehicle"
                          : "Category"}
                    </Badge>
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
            <div className="border-t px-4 py-2">
              <button
                type="button"
                className="flex w-full items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setShowSuggestions(false);
                  if (query.trim())
                    router.push(
                      `/search?q=${encodeURIComponent(query.trim())}`
                    );
                }}
              >
                <Search className="h-3 w-3" />
                Search all results for &ldquo;{query}&rdquo;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
