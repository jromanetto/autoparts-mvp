import type { MetadataRoute } from "next";
import { demoParts, demoCategories, demoManufacturers, demoMakes, demoModels } from "@/lib/demo-data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://autoparts.example.com";
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/parts`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/vehicles`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const partPages: MetadataRoute.Sitemap = demoParts.map((part) => ({
    url: `${baseUrl}/parts/${part.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = demoCategories
    .filter((c) => !c.parentId)
    .map((cat) => ({
      url: `${baseUrl}/parts?categoryId=${cat.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  const manufacturerPages: MetadataRoute.Sitemap = demoManufacturers.map((mfr) => ({
    url: `${baseUrl}/parts?manufacturerId=${mfr.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const vehicleMakePages: MetadataRoute.Sitemap = demoMakes.map((make) => ({
    url: `${baseUrl}/vehicles?make=${make.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const vehicleModelPages: MetadataRoute.Sitemap = demoModels.map((model) => ({
    url: `${baseUrl}/vehicles?make=${demoMakes.find((m) => m.id === model.makeId)?.id || ""}&model=${model.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...partPages,
    ...categoryPages,
    ...manufacturerPages,
    ...vehicleMakePages,
    ...vehicleModelPages,
  ];
}
