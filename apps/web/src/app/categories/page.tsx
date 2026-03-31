import Link from "next/link";
import { LayoutGrid, ChevronRight } from "lucide-react";
import { getCategories } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Categories — AutoParts",
  description: "Browse automotive parts by category.",
};

export default async function CategoriesPage() {
  let categories;
  try {
    const data = await getCategories();
    categories = data.data;
  } catch {
    return (
      <div className="container py-16 text-center">
        <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Unable to load categories</h2>
        <p className="mt-2 text-muted-foreground">
          Make sure the API server is running on port 3000.
        </p>
      </div>
    );
  }

  // Separate root vs child categories
  const rootCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Parts Categories</h1>
        <p className="mt-2 text-muted-foreground">
          Browse {categories.length} categories to find the parts you need.
        </p>
      </div>

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
                        <span className="text-muted-foreground">└</span>
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
    </div>
  );
}
