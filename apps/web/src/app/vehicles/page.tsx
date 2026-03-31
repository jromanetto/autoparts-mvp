"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Car, ChevronRight, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { VehicleMake, VehicleModel, Vehicle } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: { "X-API-Key": API_KEY },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export default function VehiclesPage() {
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedMake, setSelectedMake] = useState<VehicleMake | null>(null);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Load makes on mount
  useEffect(() => {
    fetchApi<{ data: VehicleMake[] }>("/vehicles/makes?limit=100")
      .then((res) => { setMakes(res.data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  // Load models when make selected
  useEffect(() => {
    if (!selectedMake) { setModels([]); return; }
    setLoading(true);
    fetchApi<{ data: VehicleModel[] }>(`/vehicles/models?makeId=${selectedMake.id}&limit=100`)
      .then((res) => { setModels(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedMake]);

  // Load vehicles when model selected
  useEffect(() => {
    if (!selectedModel) { setVehicles([]); return; }
    setLoading(true);
    fetchApi<{ data: Vehicle[] }>(`/vehicles?modelId=${selectedModel.id}&limit=100`)
      .then((res) => { setVehicles(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedModel]);

  const handleBack = () => {
    if (selectedModel) {
      setSelectedModel(null);
      setVehicles([]);
    } else if (selectedMake) {
      setSelectedMake(null);
      setModels([]);
    }
  };

  if (error) {
    return (
      <div className="container py-16 text-center">
        <Car className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Unable to load vehicles</h2>
        <p className="mt-2 text-muted-foreground">
          Make sure the API server is running on port 3000.
        </p>
      </div>
    );
  }

  // Breadcrumb
  const breadcrumb = [
    { label: "Makes", active: !selectedMake },
    ...(selectedMake ? [{ label: selectedMake.name, active: !selectedModel }] : []),
    ...(selectedModel ? [{ label: selectedModel.name, active: true }] : []),
  ];

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Vehicle Lookup</h1>
        <p className="mt-2 text-muted-foreground">
          Select a make, model, and variant to find compatible parts.
        </p>
      </div>

      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        {(selectedMake || selectedModel) && (
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        {breadcrumb.map((crumb, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className={crumb.active ? "font-semibold" : "text-muted-foreground"}>
              {crumb.label}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Makes list */}
        {!selectedMake && (
          <motion.div
            key="makes"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
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
                        <h3 className="font-semibold truncate">{make.name}</h3>
                        {make.country && (
                          <p className="text-xs text-muted-foreground">{make.country}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </CardContent>
                  </Card>
                ))}
          </motion.div>
        )}

        {/* Models list */}
        {selectedMake && !selectedModel && (
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
                    <p className="text-muted-foreground">No models found for {selectedMake.name}.</p>
                  </div>
                ) : models.map((model) => (
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
                ))}
          </motion.div>
        )}

        {/* Vehicles (variants) list */}
        {selectedModel && (
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
                    <p className="text-muted-foreground">No variants found for {selectedModel.name}.</p>
                  </div>
                ) : vehicles.map((vehicle) => (
                  <Link key={vehicle.id} href={`/search?q=${encodeURIComponent(`${selectedMake?.name} ${selectedModel.name}`)}`}>
                    <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {selectedMake?.name} {selectedModel.name}
                              {vehicle.trim ? ` ${vehicle.trim}` : ""}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {vehicle.yearStart && (
                                <Badge variant="outline">
                                  {vehicle.yearStart}{vehicle.yearEnd ? `–${vehicle.yearEnd}` : "+"}
                                </Badge>
                              )}
                              {vehicle.engineCode && (
                                <Badge variant="outline">Engine: {vehicle.engineCode}</Badge>
                              )}
                              {vehicle.fuelType && (
                                <Badge variant="outline">{vehicle.fuelType}</Badge>
                              )}
                              {vehicle.bodyType && (
                                <Badge variant="outline">{vehicle.bodyType}</Badge>
                              )}
                              {vehicle.engineDisplacementCc && (
                                <Badge variant="outline">{vehicle.engineDisplacementCc}cc</Badge>
                              )}
                              {vehicle.ktypeNumber && (
                                <Badge variant="secondary">K-Type: {vehicle.ktypeNumber}</Badge>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="shrink-0 gap-1">
                            Find Parts <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
