"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar({
  defaultValue = "",
  placeholder = "Search by part name, OEM number, or vehicle...",
  size = "default",
}: {
  defaultValue?: string;
  placeholder?: string;
  size?: "default" | "lg";
}) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  const isLarge = size === "lg";

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex w-full gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative flex-1">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${isLarge ? "h-5 w-5" : "h-4 w-4"}`} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={`${isLarge ? "h-14 pl-11 text-lg" : "h-10 pl-9"}`}
        />
      </div>
      <Button type="submit" size={isLarge ? "lg" : "default"} className={isLarge ? "h-14 px-8" : ""}>
        Search
      </Button>
    </motion.form>
  );
}
