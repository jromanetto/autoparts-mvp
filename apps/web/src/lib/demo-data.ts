/**
 * Embedded demo data for static export mode.
 * When the API is unavailable (e.g. GitHub Pages), pages use this data.
 */

import type { PartWithRelations, Category, Manufacturer, VehicleMake, VehicleModel, Vehicle, CrossReference } from "./api";

export const demoCategories: Category[] = [
  { id: "cat-1", parentId: null, name: "Braking System", slug: "braking-system", description: "Components for vehicle braking", level: 0, sortOrder: 1 },
  { id: "cat-2", parentId: null, name: "Engine", slug: "engine", description: "Engine components and accessories", level: 0, sortOrder: 2 },
  { id: "cat-3", parentId: null, name: "Filters", slug: "filters", description: "Filtration systems for air oil and fuel", level: 0, sortOrder: 3 },
  { id: "cat-4", parentId: null, name: "Electrical", slug: "electrical", description: "Electrical and electronic components", level: 0, sortOrder: 4 },
  { id: "cat-5", parentId: null, name: "Suspension", slug: "suspension", description: "Suspension and steering components", level: 0, sortOrder: 5 },
  { id: "cat-6", parentId: null, name: "Transmission", slug: "transmission", description: "Clutch and transmission parts", level: 0, sortOrder: 6 },
  { id: "cat-7", parentId: null, name: "Cooling System", slug: "cooling-system", description: "Engine and cabin cooling components", level: 0, sortOrder: 7 },
  { id: "cat-8", parentId: null, name: "Lighting", slug: "lighting", description: "Vehicle lighting components", level: 0, sortOrder: 8 },
  { id: "cat-9", parentId: null, name: "Exhaust", slug: "exhaust", description: "Exhaust system components", level: 0, sortOrder: 9 },
  { id: "cat-10", parentId: null, name: "Body Parts", slug: "body-parts", description: "Exterior and interior body components", level: 0, sortOrder: 10 },
  { id: "cat-11", parentId: "cat-1", name: "Brake Pads", slug: "brake-pads", description: "Friction material for disc brakes", level: 1, sortOrder: 1 },
  { id: "cat-12", parentId: "cat-1", name: "Brake Discs", slug: "brake-discs", description: "Rotating discs for disc brake systems", level: 1, sortOrder: 2 },
  { id: "cat-13", parentId: "cat-3", name: "Oil Filters", slug: "oil-filters", description: "Engine oil filtration", level: 1, sortOrder: 1 },
  { id: "cat-14", parentId: "cat-3", name: "Air Filters", slug: "air-filters", description: "Engine air intake filtration", level: 1, sortOrder: 2 },
  { id: "cat-15", parentId: "cat-3", name: "Fuel Filters", slug: "fuel-filters", description: "Fuel system filtration", level: 1, sortOrder: 3 },
  { id: "cat-16", parentId: "cat-3", name: "Cabin Filters", slug: "cabin-filters", description: "Interior air filtration pollen filters", level: 1, sortOrder: 4 },
  { id: "cat-17", parentId: "cat-2", name: "Spark Plugs", slug: "spark-plugs", description: "Ignition spark plugs for petrol engines", level: 1, sortOrder: 3 },
  { id: "cat-18", parentId: "cat-4", name: "Alternators", slug: "alternators", description: "Engine-driven generators", level: 1, sortOrder: 1 },
  { id: "cat-19", parentId: "cat-4", name: "Starters", slug: "starters", description: "Engine starter motors", level: 1, sortOrder: 2 },
  { id: "cat-20", parentId: "cat-5", name: "Shock Absorbers", slug: "shock-absorbers", description: "Dampers for suspension systems", level: 1, sortOrder: 1 },
];

export const demoManufacturers: Manufacturer[] = [
  { id: "mfr-1", name: "Bosch", slug: "bosch", country: "Germany", website: "https://www.bosch.com", logoUrl: null },
  { id: "mfr-2", name: "Mann-Filter", slug: "mann-filter", country: "Germany", website: "https://www.mann-filter.com", logoUrl: null },
  { id: "mfr-3", name: "Mahle", slug: "mahle", country: "Germany", website: "https://www.mahle.com", logoUrl: null },
  { id: "mfr-4", name: "Valeo", slug: "valeo", country: "France", website: "https://www.valeo.com", logoUrl: null },
  { id: "mfr-5", name: "Brembo", slug: "brembo", country: "Italy", website: "https://www.brembo.com", logoUrl: null },
  { id: "mfr-6", name: "Continental", slug: "continental", country: "Germany", website: "https://www.continental.com", logoUrl: null },
  { id: "mfr-7", name: "Denso", slug: "denso", country: "Japan", website: "https://www.denso.com", logoUrl: null },
  { id: "mfr-8", name: "NGK", slug: "ngk", country: "Japan", website: "https://www.ngkntk.com", logoUrl: null },
  { id: "mfr-9", name: "SKF", slug: "skf", country: "Sweden", website: "https://www.skf.com", logoUrl: null },
  { id: "mfr-10", name: "Monroe", slug: "monroe", country: "Belgium", website: "https://www.monroe.com", logoUrl: null },
];

export const demoParts: PartWithRelations[] = [
  { id: "part-1", oemNumber: "0986494524", name: "Bosch Front Brake Pad Set", description: "Low-dust ceramic front brake pads for European vehicles", status: "active", manufacturerId: "mfr-1", categoryId: "cat-11", specifications: null, weightGrams: 450, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Bosch", categoryName: "Brake Pads" },
  { id: "part-2", oemNumber: "0986479C26", name: "Bosch Vented Front Brake Disc 312mm", description: "Vented front brake disc 312x25mm", status: "active", manufacturerId: "mfr-1", categoryId: "cat-12", specifications: null, weightGrams: 7800, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Bosch", categoryName: "Brake Discs" },
  { id: "part-3", oemNumber: "F026407157", name: "Bosch Oil Filter", description: "Spin-on engine oil filter", status: "active", manufacturerId: "mfr-1", categoryId: "cat-13", specifications: null, weightGrams: 280, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Bosch", categoryName: "Oil Filters" },
  { id: "part-4", oemNumber: "F026400497", name: "Bosch Air Filter Element", description: "Panel air filter for turbocharged engines", status: "active", manufacturerId: "mfr-1", categoryId: "cat-14", specifications: null, weightGrams: 320, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Bosch", categoryName: "Air Filters" },
  { id: "part-5", oemNumber: "0242236571", name: "Bosch Iridium Spark Plug FR7NI332S", description: "Long-life iridium spark plug", status: "active", manufacturerId: "mfr-1", categoryId: "cat-17", specifications: null, weightGrams: 45, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Bosch", categoryName: "Spark Plugs" },
  { id: "part-6", oemNumber: "W712/94", name: "Mann Oil Filter W712/94", description: "Spin-on oil filter for VAG group", status: "active", manufacturerId: "mfr-2", categoryId: "cat-13", specifications: null, weightGrams: 265, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Mann-Filter", categoryName: "Oil Filters" },
  { id: "part-7", oemNumber: "C27006", name: "Mann Air Filter C27006", description: "Flat panel air filter element", status: "active", manufacturerId: "mfr-2", categoryId: "cat-14", specifications: null, weightGrams: 290, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Mann-Filter", categoryName: "Air Filters" },
  { id: "part-8", oemNumber: "OC456", name: "Mahle Oil Filter OC456", description: "Spin-on engine oil filter", status: "active", manufacturerId: "mfr-3", categoryId: "cat-13", specifications: null, weightGrams: 275, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Mahle", categoryName: "Oil Filters" },
  { id: "part-9", oemNumber: "LX3778", name: "Mahle Air Filter LX3778", description: "Engine air intake filter element", status: "active", manufacturerId: "mfr-3", categoryId: "cat-14", specifications: null, weightGrams: 310, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Mahle", categoryName: "Air Filters" },
  { id: "part-10", oemNumber: "826631", name: "Valeo Clutch Kit 826631", description: "Complete clutch kit with disc, pressure plate, and bearing", status: "active", manufacturerId: "mfr-4", categoryId: "cat-6", specifications: null, weightGrams: 5200, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Valeo", categoryName: "Transmission" },
  { id: "part-11", oemNumber: "09.A820.11", name: "Brembo Front Brake Disc", description: "High-carbon cast iron vented brake disc", status: "active", manufacturerId: "mfr-5", categoryId: "cat-12", specifications: null, weightGrams: 8200, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Brembo", categoryName: "Brake Discs" },
  { id: "part-12", oemNumber: "P85150", name: "Brembo Front Brake Pad Set", description: "Premium ceramic brake pads", status: "active", manufacturerId: "mfr-5", categoryId: "cat-11", specifications: null, weightGrams: 420, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Brembo", categoryName: "Brake Pads" },
  { id: "part-13", oemNumber: "0986049860", name: "Bosch Alternator 150A", description: "14V 150A alternator with voltage regulator", status: "active", manufacturerId: "mfr-1", categoryId: "cat-18", specifications: null, weightGrams: 5800, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Bosch", categoryName: "Alternators" },
  { id: "part-14", oemNumber: "0986022800", name: "Bosch Starter Motor 1.4kW", description: "Gear reduction starter motor", status: "active", manufacturerId: "mfr-1", categoryId: "cat-19", specifications: null, weightGrams: 4200, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Bosch", categoryName: "Starters" },
  { id: "part-15", oemNumber: "BKR6EIX-11", name: "NGK Iridium IX Spark Plug", description: "Iridium IX long-life spark plug", status: "active", manufacturerId: "mfr-8", categoryId: "cat-17", specifications: null, weightGrams: 42, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "NGK", categoryName: "Spark Plugs" },
  { id: "part-16", oemNumber: "VKBA6556", name: "SKF Front Wheel Bearing Kit", description: "Hub bearing kit with ABS sensor ring", status: "active", manufacturerId: "mfr-9", categoryId: "cat-5", specifications: null, weightGrams: 980, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "SKF", categoryName: "Suspension" },
  { id: "part-17", oemNumber: "G8096", name: "Monroe Gas-Matic Shock Absorber", description: "Gas-charged twin-tube shock absorber", status: "active", manufacturerId: "mfr-10", categoryId: "cat-20", specifications: null, weightGrams: 2400, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Monroe", categoryName: "Shock Absorbers" },
  { id: "part-18", oemNumber: "1987432598", name: "Bosch Cabin Filter with Activated Carbon", description: "Activated carbon pollen filter", status: "active", manufacturerId: "mfr-1", categoryId: "cat-16", specifications: null, weightGrams: 150, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Bosch", categoryName: "Cabin Filters" },
  { id: "part-19", oemNumber: "F026402848", name: "Bosch Fuel Filter", description: "Inline fuel filter for diesel engines", status: "active", manufacturerId: "mfr-1", categoryId: "cat-15", specifications: null, weightGrams: 190, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Bosch", categoryName: "Fuel Filters" },
  { id: "part-20", oemNumber: "0281006405", name: "Bosch Lambda Sensor Wideband", description: "Wideband oxygen sensor pre-cat", status: "active", manufacturerId: "mfr-1", categoryId: "cat-9", specifications: null, weightGrams: 120, dimensions: null, imageUrls: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", manufacturerName: "Bosch", categoryName: "Exhaust" },
];

export const demoCrossRefs: CrossReference[] = [
  { id: "xref-1", partId: "part-1", crossRefOemNumber: "GDB1550", crossRefManufacturer: "TRW", crossRefType: "equivalent", notes: null },
  { id: "xref-2", partId: "part-1", crossRefOemNumber: "FDB1832", crossRefManufacturer: "Ferodo", crossRefType: "equivalent", notes: null },
  { id: "xref-3", partId: "part-2", crossRefOemNumber: "09.B355.11", crossRefManufacturer: "Brembo", crossRefType: "equivalent", notes: null },
  { id: "xref-4", partId: "part-3", crossRefOemNumber: "W712/94", crossRefManufacturer: "Mann-Filter", crossRefType: "equivalent", notes: null },
];

export const demoMakes: VehicleMake[] = [
  { id: "make-1", name: "Peugeot", slug: "peugeot", country: "France" },
  { id: "make-2", name: "Renault", slug: "renault", country: "France" },
  { id: "make-3", name: "Volkswagen", slug: "volkswagen", country: "Germany" },
  { id: "make-4", name: "BMW", slug: "bmw", country: "Germany" },
  { id: "make-5", name: "Mercedes-Benz", slug: "mercedes-benz", country: "Germany" },
  { id: "make-6", name: "Audi", slug: "audi", country: "Germany" },
  { id: "make-7", name: "Citroën", slug: "citroen", country: "France" },
  { id: "make-8", name: "Fiat", slug: "fiat", country: "Italy" },
  { id: "make-9", name: "Toyota", slug: "toyota", country: "Japan" },
  { id: "make-10", name: "Ford", slug: "ford", country: "USA" },
];

export const demoModels: VehicleModel[] = [
  { id: "model-1", makeId: "make-1", name: "308", slug: "308" },
  { id: "model-2", makeId: "make-1", name: "208", slug: "208" },
  { id: "model-3", makeId: "make-2", name: "Clio", slug: "clio" },
  { id: "model-4", makeId: "make-2", name: "Megane", slug: "megane" },
  { id: "model-5", makeId: "make-3", name: "Golf", slug: "golf" },
  { id: "model-6", makeId: "make-3", name: "Polo", slug: "polo" },
  { id: "model-7", makeId: "make-4", name: "3 Series", slug: "3-series" },
  { id: "model-8", makeId: "make-5", name: "C-Class", slug: "c-class" },
  { id: "model-9", makeId: "make-6", name: "A3", slug: "a3" },
  { id: "model-10", makeId: "make-10", name: "Focus", slug: "focus" },
];

export const demoVehicles: Vehicle[] = [
  { id: "veh-1", modelId: "model-1", yearStart: 2013, yearEnd: 2021, engineCode: "EP6FDTM", engineDisplacementCc: 1598, fuelType: "Petrol", bodyType: "Hatchback", trim: "GT Line", ktypeNumber: "50123" },
  { id: "veh-2", modelId: "model-1", yearStart: 2017, yearEnd: 2023, engineCode: "DV5RC", engineDisplacementCc: 1499, fuelType: "Diesel", bodyType: "Hatchback", trim: "Allure", ktypeNumber: "50124" },
  { id: "veh-3", modelId: "model-3", yearStart: 2019, yearEnd: null, engineCode: "H5Ft", engineDisplacementCc: 1333, fuelType: "Petrol", bodyType: "Hatchback", trim: "RS Line", ktypeNumber: "60201" },
  { id: "veh-4", modelId: "model-5", yearStart: 2020, yearEnd: null, engineCode: "DFYA", engineDisplacementCc: 1498, fuelType: "Petrol", bodyType: "Hatchback", trim: "R-Line", ktypeNumber: "70301" },
  { id: "veh-5", modelId: "model-7", yearStart: 2019, yearEnd: 2025, engineCode: "B48B20", engineDisplacementCc: 1998, fuelType: "Petrol", bodyType: "Sedan", trim: "M Sport", ktypeNumber: "80401" },
];
