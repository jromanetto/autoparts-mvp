function getApiBase(): string {
  // Explicit public URL (baked at build time)
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  // Server-side: use internal URL for direct backend calls
  if (typeof window === "undefined" && process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL;
  }
  // Development default
  if (typeof window === "undefined") return "http://localhost:3000";
  // Client-side without explicit URL: use relative paths (proxied by middleware)
  return "";
}

const API_BASE = getApiBase();
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

interface FetchOptions {
  params?: Record<string, string | number | undefined>;
  revalidate?: number;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const base = API_BASE || "http://localhost";
  const url = new URL(`/api/v1${path}`, base);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  // Use relative path for client-side proxy mode
  const fetchUrl = API_BASE ? url.toString() : url.pathname + url.search;

  const res = await fetch(fetchUrl, {
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    next: { revalidate: options.revalidate ?? 60 },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

// Paginated response shape
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// --- Parts ---
export interface Part {
  id: string;
  oemNumber: string;
  name: string;
  description: string | null;
  status: string;
  manufacturerId: string;
  categoryId: string | null;
  specifications: Record<string, unknown> | null;
  weightGrams: number | null;
  dimensions: { lengthMm?: number; widthMm?: number; heightMm?: number } | null;
  imageUrls: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartWithRelations extends Part {
  manufacturerName: string | null;
  categoryName: string | null;
}

export interface CrossReference {
  id: string;
  partId: string;
  crossRefOemNumber: string;
  crossRefManufacturer: string | null;
  crossRefType: string;
  notes: string | null;
}

export async function getParts(params?: {
  page?: number;
  limit?: number;
  manufacturerId?: string;
  categoryId?: string;
  search?: string;
  status?: string;
  sort?: string;
  order?: string;
}) {
  return apiFetch<PaginatedResponse<PartWithRelations>>("/parts", { params });
}

export async function getPart(id: string) {
  return apiFetch<Part & { crossReferences?: CrossReference[]; manufacturer?: { name: string }; category?: { name: string } }>(`/parts/${id}`);
}

export async function getPartCrossRefs(id: string) {
  return apiFetch<CrossReference[]>(`/parts/${id}/cross-references`);
}

// --- Vehicles ---
export interface VehicleMake {
  id: string;
  name: string;
  slug: string;
  country: string | null;
}

export interface VehicleModel {
  id: string;
  makeId: string;
  name: string;
  slug: string;
}

export interface Vehicle {
  id: string;
  modelId: string;
  yearStart: number | null;
  yearEnd: number | null;
  engineCode: string | null;
  engineDisplacementCc: number | null;
  fuelType: string | null;
  bodyType: string | null;
  trim: string | null;
  ktypeNumber: string | null;
}

export async function getVehicleMakes() {
  return apiFetch<PaginatedResponse<VehicleMake>>("/vehicles/makes", {
    params: { limit: 100 },
  });
}

export async function getVehicleMake(id: string) {
  return apiFetch<VehicleMake>(`/vehicles/makes/${id}`);
}

export async function getVehicleModels(makeId?: string) {
  return apiFetch<PaginatedResponse<VehicleModel>>("/vehicles/models", {
    params: { makeId, limit: 100 },
  });
}

export async function getVehicles(params?: {
  modelId?: string;
  page?: number;
  limit?: number;
}) {
  return apiFetch<PaginatedResponse<Vehicle>>("/vehicles", { params });
}

// --- Categories ---
export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  level: number;
  sortOrder: number;
}

export async function getCategories(parentId?: string) {
  return apiFetch<PaginatedResponse<Category>>("/categories", {
    params: { parentId, limit: 100 },
  });
}

export async function getCategory(id: string) {
  return apiFetch<Category>(`/categories/${id}`);
}

// --- Manufacturers ---
export interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  website: string | null;
  logoUrl: string | null;
}

export async function getManufacturers() {
  return apiFetch<PaginatedResponse<Manufacturer>>("/manufacturers", {
    params: { limit: 100 },
  });
}

// --- Search ---
export interface SearchResult {
  id: string;
  oemNumber: string;
  name: string;
  description?: string | null;
  status: string;
  manufacturerName: string | null;
  categoryName: string | null;
}

export async function searchParts(q: string, params?: { page?: number; limit?: number }) {
  return apiFetch<PaginatedResponse<SearchResult>>("/search", {
    params: { q, type: "parts", ...params },
  });
}

export interface VehicleSearchResult {
  id: string;
  yearStart: number | null;
  yearEnd: number | null;
  engineCode: string | null;
  fuelType: string | null;
  bodyType: string | null;
  trim: string | null;
  ktypeNumber: string | null;
  modelName: string;
  makeName: string;
}

export async function searchVehicles(q: string, params?: { page?: number; limit?: number }) {
  return apiFetch<PaginatedResponse<VehicleSearchResult>>("/search", {
    params: { q, type: "vehicles", ...params },
  });
}

// --- Compatibility ---
export interface Compatibility {
  id: string;
  partId: string;
  vehicleId: string;
  fitmentNotes: string | null;
  quantityNeeded: number | null;
  position: string | null;
  verified: boolean;
}

export async function getPartVehicles(partId: string) {
  return apiFetch<PaginatedResponse<Compatibility & { vehicleMake?: string; vehicleModel?: string; yearStart?: number; yearEnd?: number }>>(`/compatibility`, {
    params: { partId, limit: 100 },
  });
}

export async function getVehicleParts(vehicleId: string, params?: { page?: number; limit?: number; categoryId?: string }) {
  return apiFetch<PaginatedResponse<SearchResult & { fitmentNotes?: string; quantityNeeded?: number; position?: string; verified?: boolean }>>(`/search/vehicles/${vehicleId}/parts`, { params });
}
