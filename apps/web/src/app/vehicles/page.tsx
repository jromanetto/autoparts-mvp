"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  ChevronRight,
  Package,
  Search,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SearchBar } from "@/components/search-bar";
import { demoMakes, demoModels, demoVehicles, demoParts } from "@/lib/demo-data";
import { staggerContainer, staggerItem, cardHover } from "@/lib/motion";
import type { VehicleMake, VehicleModel, Vehicle, SearchResult } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

async function fetchApi<T>(path: string): Promise<T> {
  const base = API_BASE || "http://localhost:3000";
  const res = await fetch(`${base}/api/v1${path}`, {
    headers: { "X-API-Key": API_KEY },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
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

export default function VehiclesPage() {
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedMake, setSelectedMake] = useState<VehicleMake | null>(null);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [compatibleParts, setCompatibleParts] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [partsLoading, setPartsLoading] = useState(false);

  // Load makes on mount
  useEffect(() => {
    fetchApi<{ data: VehicleMake[] }>("/vehicles/makes?limit=100")
      .then((res) => {
        setMakes(res.data);
        setLoading(false);
      })
      .catch(() => {
        setMakes(demoMakes);
        setLoading(false);
      });
  }, []);

  // Load models when make selected
  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      return;
    }
    setLoading(true);
    fetchApi<{ data: VehicleModel[] }>(
      `/vehicles/models?makeId=${selectedMake.id}&limit=100`
    )
      .then((res) => {
        setModels(res.data);
        setLoading(false);
      })
      .catch(() => {
        setModels(demoModels.filter((m) => m.makeId === selectedMake.id));
        setLoading(false);
      });
  }, [selectedMake]);

  // Load vehicles when model selected
  useEffect(() => {
    if (!selectedModel) {
      setVehicles([]);
      return;
    }
    setLoading(true);
    fetchApi<{ data: Vehicle[] }>(
      `/vehicles?modelId=${selectedModel.id}&limit=100`
    )
      .then((res) => {
        setVehicles(res.data);
        setLoading(false);
      })
      .catch(() => {
        setVehicles(
          demoVehicles.filter((v) => v.modelId === selectedModel.id)
        );
        setLoading(false);
      });
  }, [selectedModel]);

  // Load compatible parts when vehicle selected
  useEffect(() => {
    if (!selectedVehicle) {
      setCompatibleParts([]);
      return;
    }
    setPartsLoading(true);
    fetchApi<{ data: SearchResult[] }>(
      `/search/vehicles/${selectedVehicle.id}/parts?limit=50`
    )
      .then((res) => {
        setCompatibleParts(res.data);
        setPartsLoading(false);
      })
      .catch(() => {
        // Demo fallback: show some parts as compatible
        setCompatibleParts(
          demoParts.slice(0, 8).map((p) => ({
            id: p.id,
            oemNumber: p.oemNumber,
            name: p.name,
            description: p.description,
            status: p.status,
            manufacturerName: p.manufacturerName,
            categoryName: p.categoryName,
          }))
        );
        setPartsLoading(false);
      });
  }, [selectedVehicle]);

  const handleBack = () => {
    if (selectedVehicle) {
      setSelectedVehicle(null);
      setCompatibleParts([]);
    } else if (selectedModel) {
      setSelectedModel(null);
      setVehicles([]);
    } else if (selectedMake) {
      setSelectedMake(null);
      setModels([]);
    }
  };

  const currentStep = selectedVehicle
    ? "parts"
    : selectedModel
      ? "variants"
      : selectedMake
        ? "models"
        : "makes";

  return (
    <div className="container py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {selectedMake ? (
            <>
              <BreadcrumbItem>
                <button
                  onClick={() => {
                    setSelectedMake(null);
                    setSelectedModel(null);
                    setSelectedVehicle(null);
                    setModels([]);
                    setVehicles([]);
                    setCompatibleParts([]);
                  }}
                  className="transition-colors hover:text-foreground text-muted-foreground"
                >
                  Vehicles
                </button>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {selectedModel ? (
                <>
                  <BreadcrumbItem>
                    <button
                      onClick={() => {
                        setSelectedModel(null);
                        setSelectedVehicle(null);
                        setVehicles([]);
                        setCompatibleParts([]);
                      }}
                      className="transition-colors hover:text-foreground text-muted-foreground"
                    >
                      {selectedMake.name}
                    </button>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  {selectedVehicle ? (
                    <>
                      <BreadcrumbItem>
                        <button
                          onClick={() => {
                            setSelectedVehicle(null);
                            setCompatibleParts([]);
                          }}
                          className="transition-colors hover:text-foreground text-muted-foreground"
                        >
                          {selectedModel.name}
                        </button>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {selectedVehicle.engineCode || selectedVehicle.trim || "Variant"}
                      </BreadcrumbItem>
                    </>
                  ) : (
                    <BreadcrumbItem>{selectedModel.name}</BreadcrumbItem>
                  )}
                </>
              ) : (
                <BreadcrumbItem>{selectedMake.name}</BreadcrumbItem>
              )}
            </>
          ) : (
            <BreadcrumbItem>Vehicles</BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <div className="flex items-center gap-4">
          {currentStep !== "makes" && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {currentStep === "parts"
                ? `Parts for ${selectedMake?.name} ${selectedModel?.name}`
                : "Vehicle Lookup"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {currentStep === "makes" && "Select a make to find compatible parts."}
              {currentStep === "models" &&
                `Choose a ${selectedMake?.name} model.`}
              {currentStep === "variants" &&
                `Select your ${selectedMake?.name} ${selectedModel?.name} variant.`}
              {currentStep === "parts" &&
                `${compatibleParts.length} compatible parts found.`}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mt-6 flex items-center gap-2 text-sm">
          {["Make", "Model", "Variant", "Parts"].map((step, i) => {
            const stepKeys = ["makes", "models", "variants", "parts"];
            const isActive = stepKeys.indexOf(currentStep) >= i;
            const isCurrent = stepKeys[i] === currentStep;
            return (
              <div key={step} className="flex items-center gap-2">
                {i > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Makes list */}
        {currentStep === "makes" && (
          <motion.div
            key="makes"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="mb-6 max-w-md">
              <SearchBar
                placeholder="Search for a make..."
                size="default"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))
                : makes.map((make) => (
                    <Card
                      key={make.id}
                      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                      onClick={() => setSelectedMake(make)}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Car className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {make.name}
                          </h3>
                          {make.country && (
                            <p className="text-xs text-muted-foreground">
                              {make.country}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </CardContent>
                    </Card>
                  ))}
            </div>
          </motion.div>
        )}

        {/* Models list */}
        {currentStep === "models" && (
          <motion.div
            key="models"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))
              : models.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">
                      No models found for {selectedMake?.name}.
                    </p>
                  </div>
                ) : (
                  models.map((model) => (
                    <Card
                      key={model.id}
                      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                      onClick={() => setSelectedModel(model)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <h3 className="font-semibold">{model.name}</h3>
                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </CardContent>
                    </Card>
                  ))
                )}
          </motion.div>
        )}

        {/* Vehicles (variants) list */}
        {currentStep === "variants" && (
          <motion.div
            key="vehicles"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))
              : vehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No variants found for {selectedModel?.name}.
                    </p>
                  </div>
                ) : (
                  vehicles.map((vehicle) => (
                    <Card
                      key={vehicle.id}
                      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                      onClick={() => setSelectedVehicle(vehicle)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {selectedMake?.name} {selectedModel?.name}
                              {vehicle.trim ? ` ${vehicle.trim}` : ""}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {vehicle.yearStart && (
                                <Badge variant="outline">
                                  {vehicle.yearStart}
                                  {vehicle.yearEnd
                                    ? `–${vehicle.yearEnd}`
                                    : "+"}
                                </Badge>
                              )}
                              {vehicle.engineCode && (
                                <Badge variant="outline" className="font-mono">
                                  {vehicle.engineCode}
                                </Badge>
                              )}
                              {vehicle.fuelType && (
                                <Badge variant="secondary">
                                  {vehicle.fuelType}
                                </Badge>
                              )}
                              {vehicle.bodyType && (
                                <Badge variant="secondary">
                                  {vehicle.bodyType}
                                </Badge>
                              )}
                              {vehicle.engineDisplacementCc && (
                                <Badge variant="outline">
                                  {vehicle.engineDisplacementCc}cc
                                </Badge>
                              )}
                              {vehicle.ktypeNumber && (
                                <Badge variant="outline" className="font-mono">
                                  K-Type: {vehicle.ktypeNumber}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            className="shrink-0 gap-1"
                          >
                            Find Parts <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
          </motion.div>
        )}

        {/* Compatible parts for selected vehicle */}
        {currentStep === "parts" && (
          <motion.div
            key="parts"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Vehicle summary card */}
            {selectedVehicle && (
              <Card className="mb-6 bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Car className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {selectedMake?.name} {selectedModel?.name}
                      {selectedVehicle.trim ? ` ${selectedVehicle.trim}` : ""}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedVehicle.yearStart && (
                        <span className="text-sm text-muted-foreground">
                          {selectedVehicle.yearStart}
                          {selectedVehicle.yearEnd
                            ? `–${selectedVehicle.yearEnd}`
                            : "+"}
                        </span>
                      )}
                      {selectedVehicle.engineCode && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {selectedVehicle.engineCode}
                        </Badge>
                      )}
                      {selectedVehicle.fuelType && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedVehicle.fuelType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {partsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} shimmer className="h-44 rounded-lg" />
                ))}
              </div>
            ) : compatibleParts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h2 className="mt-4 text-xl font-semibold">
                  No compatible parts found
                </h2>
                <p className="mt-2 text-muted-foreground">
                  We don&apos;t have compatibility data for this variant yet.
                </p>
                <div className="mt-6 flex gap-3 justify-center">
                  <Link
                    href={`/search?q=${encodeURIComponent(`${selectedMake?.name} ${selectedModel?.name}`)}`}
                  >
                    <Button variant="default" className="gap-2">
                      <Search className="h-4 w-4" />
                      Search by name
                    </Button>
                  </Link>
                  <Link href="/parts">
                    <Button variant="outline">Browse catalog</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {compatibleParts.map((part) => (
                  <motion.div
                    key={part.id}
                    variants={staggerItem}
                    {...cardHover}
                  >
                    <Link href={`/parts/${part.id}`}>
                      <Card className="group h-full cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30">
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
                          <h3 className="font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
