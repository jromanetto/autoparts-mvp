"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { demoCategories } from "@/lib/demo-data";
import type { Category } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const base = API_BASE || "http://localhost:3000";
        const res = await fetch(new URL("/api/v1/categories?limit=100", base).toString(), {
          headers: { "X-API-Key": API_KEY },
        });
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        setCategories(data.data);
      } catch {
        setCategories(demoCategories);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const rootCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);

  return (
    <div className="container py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Categories</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Parts Categories</h1>
        <p className="mt-2 text-muted-foreground">
          Browse {categories.length} categories to find the parts you need.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rootCategories.map((category) => {
            const children = childCategories.filter((c) => c.parentId === category.id);
            return (
              <Card key={category.id} className="overflow-hidden">
                <Link href={`/parts?categoryId=${category.id}`}>
                  <CardContent className="group flex items-center gap-3 p-5 cursor-pointer hover:bg-accent/50 transition-colors">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <LayoutGrid className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-primary">{category.name}</h3>
                      {category.description && (
                        <p className="text-xs text-muted-foreground truncate">{category.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Link>
                {children.length > 0 && (
                  <div className="border-t">
                    {children.map((child) => (
                      <Link key={child.id} href={`/parts?categoryId=${child.id}`}>
                        <div className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-accent/50 transition-colors cursor-pointer">
                          <span className="text-muted-foreground">&lfloor;</span>
                          <span className="hover:text-primary">{child.name}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
