"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { Car, Wrench, LayoutGrid, Search, ArrowRight, Database, Globe, Zap, Hash } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Search,
    title: "Cross-Reference Search",
    description: "Find parts by OEM number, manufacturer reference, or equivalent part numbers across brands.",
  },
  {
    icon: Car,
    title: "Vehicle Compatibility",
    description: "Browse makes, models, and engine variants to find exactly which parts fit your vehicle.",
  },
  {
    icon: Database,
    title: "Comprehensive Database",
    description: "Thousands of parts from major manufacturers with detailed specifications and cross-references.",
  },
  {
    icon: Globe,
    title: "Multi-Source Aggregation",
    description: "Data aggregated from manufacturers, distributors, and aftermarket suppliers across Europe.",
  },
  {
    icon: Zap,
    title: "REST API Access",
    description: "Integrate our parts database directly into your application with our developer-friendly API.",
  },
  {
    icon: LayoutGrid,
    title: "Category Browsing",
    description: "Navigate parts by category — braking, filters, engine, suspension, and more.",
  },
];

const quickLinks = [
  { href: "/search", label: "By Reference", icon: Hash, description: "Search by OEM number or part name" },
  { href: "/vehicles", label: "By Vehicle", icon: Car, description: "Find parts for your car" },
  { href: "/categories", label: "By Category", icon: LayoutGrid, description: "Browse by part type" },
];

const stats = [
  { value: 10500, label: "Parts", suffix: "+" },
  { value: 72, label: "Manufacturers", suffix: "+" },
  { value: 843, label: "Vehicle configs", suffix: "" },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const increment = value / 40;
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 30);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref} className="text-2xl font-bold font-mono text-primary">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 md:py-32">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Europe&apos;s Auto Parts{" "}
              <span className="text-primary">Database</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Search across thousands of automotive spare parts with vehicle
              compatibility, cross-references, and manufacturer data — all in
              one place.
            </p>
          </motion.div>

          <div className="mx-auto mt-10 max-w-2xl">
            <SearchBar size="lg" />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <span>Try:</span>
            {["0986424785", "Brake pad", "Peugeot 308", "Oil filter"].map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="rounded-full border px-3 py-1 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {term}
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-t bg-muted/50 py-6">
        <div className="container">
          <div className="flex justify-center gap-12 md:gap-20">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12">
        <div className="container">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-4 md:grid-cols-3"
          >
            {quickLinks.map((link) => (
              <motion.div key={link.href} variants={item}>
                <Link href={link.href}>
                  <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <link.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{link.label}</h3>
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Built for the automotive industry
            </h2>
            <p className="mt-4 text-muted-foreground">
              A unified catalog of spare parts with vehicle-to-part
              compatibility mapping, aggregated from multiple sources.
            </p>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={item}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl rounded-2xl bg-primary p-8 text-center text-primary-foreground md:p-12"
          >
            <h2 className="text-2xl font-bold md:text-3xl">
              Ready to integrate?
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              Access our complete parts database through our REST API.
              Developer-friendly documentation and SDKs available.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/search">
                <Button size="lg" variant="secondary">
                  Explore the data
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                API Documentation
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
