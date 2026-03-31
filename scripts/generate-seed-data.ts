/**
 * Generate realistic automotive spare parts seed data.
 * Produces CSV files for: manufacturers, categories, parts, vehicles,
 * compatibility, and cross_references.
 *
 * Usage: npx tsx scripts/generate-seed-data.ts
 */

import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, "../seed-data");

// ─── Manufacturers (keep existing, already comprehensive) ───

// ─── Categories (keep existing, already comprehensive) ───

// ─── Vehicle data ───

interface VehicleSpec {
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number | null;
  engines: { code: string; cc: number; fuel: string }[];
  bodyTypes: string[];
  trims: string[];
  ktype?: string;
}

const VEHICLES: VehicleSpec[] = [
  // Volkswagen
  { make: "Volkswagen", model: "Golf VII", yearStart: 2012, yearEnd: 2019, engines: [{ code: "CJSA", cc: 1400, fuel: "gasoline" }, { code: "CRBC", cc: 2000, fuel: "diesel" }, { code: "CZCA", cc: 1400, fuel: "gasoline" }, { code: "CRLB", cc: 2000, fuel: "diesel" }], bodyTypes: ["hatchback"], trims: ["Trendline", "Comfortline", "Highline", "GTI", "GTD"] },
  { make: "Volkswagen", model: "Golf VIII", yearStart: 2019, yearEnd: null, engines: [{ code: "DPCA", cc: 1500, fuel: "gasoline" }, { code: "DTUA", cc: 2000, fuel: "diesel" }, { code: "DKRF", cc: 1000, fuel: "gasoline" }], bodyTypes: ["hatchback"], trims: ["Life", "Style", "R-Line", "GTI", "GTD"] },
  { make: "Volkswagen", model: "Polo VI", yearStart: 2017, yearEnd: null, engines: [{ code: "DKLA", cc: 1000, fuel: "gasoline" }, { code: "DKRF", cc: 1000, fuel: "gasoline" }, { code: "CZEA", cc: 1400, fuel: "gasoline" }], bodyTypes: ["hatchback"], trims: ["Trendline", "Comfortline", "Highline", "GTI"] },
  { make: "Volkswagen", model: "Passat B8", yearStart: 2014, yearEnd: 2023, engines: [{ code: "CZCA", cc: 1400, fuel: "gasoline" }, { code: "DCXA", cc: 2000, fuel: "diesel" }, { code: "CHHB", cc: 2000, fuel: "gasoline" }], bodyTypes: ["sedan", "wagon"], trims: ["Trendline", "Comfortline", "Highline", "R-Line"] },
  { make: "Volkswagen", model: "Tiguan II", yearStart: 2016, yearEnd: null, engines: [{ code: "CZCA", cc: 1400, fuel: "gasoline" }, { code: "DFGA", cc: 2000, fuel: "diesel" }, { code: "CZPA", cc: 2000, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["Trendline", "Comfortline", "Highline", "R-Line"] },
  { make: "Volkswagen", model: "T-Roc", yearStart: 2017, yearEnd: null, engines: [{ code: "DKLA", cc: 1000, fuel: "gasoline" }, { code: "CZCA", cc: 1400, fuel: "gasoline" }, { code: "DFGA", cc: 2000, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Style", "R-Line", "Sport"] },
  // BMW
  { make: "BMW", model: "3 Series F30", yearStart: 2012, yearEnd: 2019, engines: [{ code: "B47D20", cc: 2000, fuel: "diesel" }, { code: "B48B20", cc: 2000, fuel: "gasoline" }, { code: "N20B20", cc: 2000, fuel: "gasoline" }, { code: "N47D20", cc: 2000, fuel: "diesel" }], bodyTypes: ["sedan", "wagon"], trims: ["Sport", "Luxury", "M Sport"] },
  { make: "BMW", model: "3 Series G20", yearStart: 2019, yearEnd: null, engines: [{ code: "B47D20", cc: 2000, fuel: "diesel" }, { code: "B48B20", cc: 2000, fuel: "gasoline" }, { code: "B58B30", cc: 3000, fuel: "gasoline" }], bodyTypes: ["sedan", "wagon"], trims: ["Sport", "Luxury", "M Sport", "M340i"] },
  { make: "BMW", model: "5 Series G30", yearStart: 2017, yearEnd: 2023, engines: [{ code: "B47D20", cc: 2000, fuel: "diesel" }, { code: "B48B20", cc: 2000, fuel: "gasoline" }, { code: "B57D30", cc: 3000, fuel: "diesel" }, { code: "B58B30", cc: 3000, fuel: "gasoline" }], bodyTypes: ["sedan", "wagon"], trims: ["Sport", "Luxury", "M Sport", "M550i"] },
  { make: "BMW", model: "X3 G01", yearStart: 2017, yearEnd: null, engines: [{ code: "B47D20", cc: 2000, fuel: "diesel" }, { code: "B48B20", cc: 2000, fuel: "gasoline" }, { code: "B58B30", cc: 3000, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["xLine", "M Sport", "M40i"] },
  { make: "BMW", model: "1 Series F40", yearStart: 2019, yearEnd: null, engines: [{ code: "B38B15", cc: 1500, fuel: "gasoline" }, { code: "B47D20", cc: 2000, fuel: "diesel" }, { code: "B48B20", cc: 2000, fuel: "gasoline" }], bodyTypes: ["hatchback"], trims: ["Sport", "M Sport", "M135i"] },
  // Mercedes
  { make: "Mercedes-Benz", model: "C-Class W205", yearStart: 2014, yearEnd: 2021, engines: [{ code: "M264", cc: 1500, fuel: "gasoline" }, { code: "M274", cc: 2000, fuel: "gasoline" }, { code: "OM654", cc: 2000, fuel: "diesel" }], bodyTypes: ["sedan", "wagon", "coupe"], trims: ["Avantgarde", "AMG Line", "AMG C43", "AMG C63"] },
  { make: "Mercedes-Benz", model: "C-Class W206", yearStart: 2021, yearEnd: null, engines: [{ code: "M254", cc: 2000, fuel: "gasoline" }, { code: "OM654", cc: 2000, fuel: "diesel" }], bodyTypes: ["sedan", "wagon"], trims: ["Avantgarde", "AMG Line"] },
  { make: "Mercedes-Benz", model: "E-Class W213", yearStart: 2016, yearEnd: 2023, engines: [{ code: "M264", cc: 1500, fuel: "gasoline" }, { code: "M274", cc: 2000, fuel: "gasoline" }, { code: "OM654", cc: 2000, fuel: "diesel" }, { code: "M256", cc: 3000, fuel: "gasoline" }], bodyTypes: ["sedan", "wagon"], trims: ["Avantgarde", "AMG Line", "AMG E53"] },
  { make: "Mercedes-Benz", model: "A-Class W177", yearStart: 2018, yearEnd: null, engines: [{ code: "M282", cc: 1300, fuel: "gasoline" }, { code: "M260", cc: 2000, fuel: "gasoline" }, { code: "OM608", cc: 1500, fuel: "diesel" }], bodyTypes: ["hatchback", "sedan"], trims: ["Style", "Progressive", "AMG Line", "AMG A35"] },
  { make: "Mercedes-Benz", model: "GLC X253", yearStart: 2015, yearEnd: 2022, engines: [{ code: "M274", cc: 2000, fuel: "gasoline" }, { code: "OM654", cc: 2000, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Exclusive", "AMG Line", "AMG GLC43"] },
  // Audi
  { make: "Audi", model: "A3 8V", yearStart: 2012, yearEnd: 2020, engines: [{ code: "CJSA", cc: 1400, fuel: "gasoline" }, { code: "CRBC", cc: 2000, fuel: "diesel" }, { code: "CZCA", cc: 1400, fuel: "gasoline" }], bodyTypes: ["hatchback", "sedan"], trims: ["Attraction", "Ambition", "S line", "S3"] },
  { make: "Audi", model: "A4 B9", yearStart: 2015, yearEnd: null, engines: [{ code: "CVNA", cc: 2000, fuel: "diesel" }, { code: "CZHA", cc: 2000, fuel: "gasoline" }, { code: "DETA", cc: 2000, fuel: "diesel" }], bodyTypes: ["sedan", "wagon"], trims: ["Attraction", "Design", "Sport", "S line"] },
  { make: "Audi", model: "Q5 FY", yearStart: 2016, yearEnd: null, engines: [{ code: "DETA", cc: 2000, fuel: "diesel" }, { code: "CZHA", cc: 2000, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["Design", "Sport", "S line", "SQ5"] },
  { make: "Audi", model: "A6 C8", yearStart: 2018, yearEnd: null, engines: [{ code: "DETA", cc: 2000, fuel: "diesel" }, { code: "DLZA", cc: 3000, fuel: "diesel" }, { code: "DCPC", cc: 2000, fuel: "gasoline" }], bodyTypes: ["sedan", "wagon"], trims: ["Design", "Sport", "S line"] },
  // Renault
  { make: "Renault", model: "Clio V", yearStart: 2019, yearEnd: null, engines: [{ code: "H5Ht", cc: 1300, fuel: "gasoline" }, { code: "D4F", cc: 1000, fuel: "gasoline" }], bodyTypes: ["hatchback"], trims: ["Life", "Zen", "Intens", "RS Line"] },
  { make: "Renault", model: "Megane IV", yearStart: 2016, yearEnd: 2023, engines: [{ code: "H5Ht", cc: 1300, fuel: "gasoline" }, { code: "R9M", cc: 1500, fuel: "diesel" }, { code: "M5M", cc: 1800, fuel: "gasoline" }], bodyTypes: ["hatchback", "wagon"], trims: ["Life", "Zen", "Intens", "GT Line", "RS"] },
  { make: "Renault", model: "Captur II", yearStart: 2020, yearEnd: null, engines: [{ code: "H5Ht", cc: 1300, fuel: "gasoline" }, { code: "D4F", cc: 1000, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["Life", "Zen", "Intens", "RS Line"] },
  { make: "Renault", model: "Kadjar", yearStart: 2015, yearEnd: 2022, engines: [{ code: "H5Ht", cc: 1300, fuel: "gasoline" }, { code: "R9M", cc: 1500, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Life", "Zen", "Intens"] },
  // Peugeot
  { make: "Peugeot", model: "208 II", yearStart: 2019, yearEnd: null, engines: [{ code: "EB2ADT", cc: 1200, fuel: "gasoline" }, { code: "DV5RD", cc: 1500, fuel: "diesel" }], bodyTypes: ["hatchback"], trims: ["Active", "Allure", "GT Line", "GT"] },
  { make: "Peugeot", model: "308 III", yearStart: 2021, yearEnd: null, engines: [{ code: "EB2ADT", cc: 1200, fuel: "gasoline" }, { code: "DV5RD", cc: 1500, fuel: "diesel" }, { code: "EP6FADTX", cc: 1600, fuel: "gasoline" }], bodyTypes: ["hatchback", "wagon"], trims: ["Active", "Allure", "GT"] },
  { make: "Peugeot", model: "3008 II", yearStart: 2016, yearEnd: null, engines: [{ code: "EB2ADT", cc: 1200, fuel: "gasoline" }, { code: "DV5RD", cc: 1500, fuel: "diesel" }, { code: "EP6FADTX", cc: 1600, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["Active", "Allure", "GT Line", "GT"] },
  { make: "Peugeot", model: "5008 II", yearStart: 2017, yearEnd: null, engines: [{ code: "EB2ADT", cc: 1200, fuel: "gasoline" }, { code: "DV5RD", cc: 1500, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Active", "Allure", "GT Line"] },
  // Citroën
  { make: "Citroen", model: "C3 III", yearStart: 2016, yearEnd: null, engines: [{ code: "EB2ADT", cc: 1200, fuel: "gasoline" }, { code: "DV5RD", cc: 1500, fuel: "diesel" }], bodyTypes: ["hatchback"], trims: ["Feel", "Shine", "C-Series"] },
  { make: "Citroen", model: "C5 Aircross", yearStart: 2018, yearEnd: null, engines: [{ code: "EB2ADT", cc: 1200, fuel: "gasoline" }, { code: "DV5RD", cc: 1500, fuel: "diesel" }, { code: "EP6FADTX", cc: 1600, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["Feel", "Shine", "Shine Pack"] },
  // Toyota
  { make: "Toyota", model: "Yaris IV", yearStart: 2020, yearEnd: null, engines: [{ code: "M15A-FKS", cc: 1500, fuel: "gasoline" }, { code: "M15A-FXE", cc: 1500, fuel: "hybrid" }], bodyTypes: ["hatchback"], trims: ["Active", "Dynamic", "Premiere", "GR Sport"] },
  { make: "Toyota", model: "Corolla E210", yearStart: 2018, yearEnd: null, engines: [{ code: "M20A-FKS", cc: 2000, fuel: "gasoline" }, { code: "2ZR-FXE", cc: 1800, fuel: "hybrid" }], bodyTypes: ["hatchback", "sedan", "wagon"], trims: ["Active", "Dynamic", "Lounge", "GR Sport"] },
  { make: "Toyota", model: "RAV4 XA50", yearStart: 2018, yearEnd: null, engines: [{ code: "A25A-FKS", cc: 2500, fuel: "gasoline" }, { code: "A25A-FXS", cc: 2500, fuel: "hybrid" }], bodyTypes: ["suv"], trims: ["Active", "Dynamic", "Lounge", "Collection"] },
  { make: "Toyota", model: "C-HR AX10", yearStart: 2016, yearEnd: 2023, engines: [{ code: "8NR-FTS", cc: 1200, fuel: "gasoline" }, { code: "2ZR-FXE", cc: 1800, fuel: "hybrid" }], bodyTypes: ["suv"], trims: ["Active", "Dynamic", "Graphic", "Collection"] },
  // Fiat
  { make: "Fiat", model: "500 312", yearStart: 2007, yearEnd: null, engines: [{ code: "312A2", cc: 900, fuel: "gasoline" }, { code: "169A4", cc: 1200, fuel: "gasoline" }], bodyTypes: ["hatchback"], trims: ["Pop", "Lounge", "Sport", "Star"] },
  { make: "Fiat", model: "Panda 319", yearStart: 2012, yearEnd: null, engines: [{ code: "312A2", cc: 900, fuel: "gasoline" }, { code: "169A4", cc: 1200, fuel: "gasoline" }], bodyTypes: ["hatchback"], trims: ["Pop", "Lounge", "Cross", "City Life"] },
  { make: "Fiat", model: "Tipo 356", yearStart: 2015, yearEnd: null, engines: [{ code: "55282328", cc: 1400, fuel: "gasoline" }, { code: "55263088", cc: 1600, fuel: "diesel" }], bodyTypes: ["hatchback", "sedan", "wagon"], trims: ["Pop", "Lounge", "City Life", "Cross"] },
  // Opel/Vauxhall
  { make: "Opel", model: "Corsa F", yearStart: 2019, yearEnd: null, engines: [{ code: "EB2ADT", cc: 1200, fuel: "gasoline" }, { code: "DV5RD", cc: 1500, fuel: "diesel" }], bodyTypes: ["hatchback"], trims: ["Edition", "Elegance", "GS Line"] },
  { make: "Opel", model: "Astra L", yearStart: 2021, yearEnd: null, engines: [{ code: "EB2ADT", cc: 1200, fuel: "gasoline" }, { code: "DV5RD", cc: 1500, fuel: "diesel" }, { code: "EP6FADTX", cc: 1600, fuel: "gasoline" }], bodyTypes: ["hatchback", "wagon"], trims: ["Edition", "Elegance", "GS Line", "Ultimate"] },
  { make: "Opel", model: "Grandland X", yearStart: 2017, yearEnd: null, engines: [{ code: "EB2ADT", cc: 1200, fuel: "gasoline" }, { code: "DV5RD", cc: 1500, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Edition", "Elegance", "GS Line", "Ultimate"] },
  // Hyundai
  { make: "Hyundai", model: "Tucson NX4", yearStart: 2020, yearEnd: null, engines: [{ code: "G4FT", cc: 1600, fuel: "gasoline" }, { code: "D4FE", cc: 1600, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Initia", "Creative", "Executive", "N Line"] },
  { make: "Hyundai", model: "i20 BC3", yearStart: 2020, yearEnd: null, engines: [{ code: "G3LE", cc: 1000, fuel: "gasoline" }, { code: "G4LA", cc: 1200, fuel: "gasoline" }], bodyTypes: ["hatchback"], trims: ["Initia", "Creative", "N Line"] },
  { make: "Hyundai", model: "i30 PD", yearStart: 2017, yearEnd: null, engines: [{ code: "G4LD", cc: 1400, fuel: "gasoline" }, { code: "D4FC", cc: 1600, fuel: "diesel" }], bodyTypes: ["hatchback", "wagon"], trims: ["Initia", "Creative", "N Line", "N"] },
  // Kia
  { make: "Kia", model: "Sportage NQ5", yearStart: 2021, yearEnd: null, engines: [{ code: "G4FT", cc: 1600, fuel: "gasoline" }, { code: "D4FE", cc: 1600, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Motion", "Active", "GT Line"] },
  { make: "Kia", model: "Ceed CD", yearStart: 2018, yearEnd: null, engines: [{ code: "G4LD", cc: 1400, fuel: "gasoline" }, { code: "D4FC", cc: 1600, fuel: "diesel" }], bodyTypes: ["hatchback", "wagon"], trims: ["Motion", "Active", "GT Line", "GT"] },
  // Skoda
  { make: "Skoda", model: "Octavia IV", yearStart: 2019, yearEnd: null, engines: [{ code: "DPCA", cc: 1500, fuel: "gasoline" }, { code: "DTUA", cc: 2000, fuel: "diesel" }, { code: "CZCA", cc: 1400, fuel: "gasoline" }], bodyTypes: ["hatchback", "wagon"], trims: ["Active", "Ambition", "Style", "RS"] },
  { make: "Skoda", model: "Fabia IV", yearStart: 2021, yearEnd: null, engines: [{ code: "DKLA", cc: 1000, fuel: "gasoline" }, { code: "CZCA", cc: 1400, fuel: "gasoline" }], bodyTypes: ["hatchback"], trims: ["Active", "Ambition", "Style", "Monte Carlo"] },
  { make: "Skoda", model: "Kodiaq", yearStart: 2016, yearEnd: null, engines: [{ code: "CZCA", cc: 1400, fuel: "gasoline" }, { code: "DFGA", cc: 2000, fuel: "diesel" }, { code: "CZPA", cc: 2000, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["Active", "Ambition", "Style", "L&K", "RS"] },
  // Seat
  { make: "SEAT", model: "Leon IV", yearStart: 2020, yearEnd: null, engines: [{ code: "DPCA", cc: 1500, fuel: "gasoline" }, { code: "DTUA", cc: 2000, fuel: "diesel" }], bodyTypes: ["hatchback", "wagon"], trims: ["Reference", "Style", "FR", "Cupra"] },
  { make: "SEAT", model: "Ibiza V", yearStart: 2017, yearEnd: null, engines: [{ code: "DKLA", cc: 1000, fuel: "gasoline" }, { code: "CZCA", cc: 1400, fuel: "gasoline" }], bodyTypes: ["hatchback"], trims: ["Reference", "Style", "FR", "Xcellence"] },
  { make: "SEAT", model: "Ateca", yearStart: 2016, yearEnd: null, engines: [{ code: "CZCA", cc: 1400, fuel: "gasoline" }, { code: "DFGA", cc: 2000, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Reference", "Style", "FR", "Xcellence"] },
  // Ford
  { make: "Ford", model: "Focus IV", yearStart: 2018, yearEnd: null, engines: [{ code: "M1DA", cc: 1000, fuel: "gasoline" }, { code: "XQDA", cc: 1500, fuel: "gasoline" }, { code: "XXDC", cc: 1500, fuel: "diesel" }], bodyTypes: ["hatchback", "wagon"], trims: ["Trend", "Titanium", "ST-Line", "ST"] },
  { make: "Ford", model: "Puma", yearStart: 2019, yearEnd: null, engines: [{ code: "M1DA", cc: 1000, fuel: "gasoline" }, { code: "XQDA", cc: 1500, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["Titanium", "ST-Line", "ST-Line X", "ST"] },
  { make: "Ford", model: "Kuga III", yearStart: 2019, yearEnd: null, engines: [{ code: "XQDA", cc: 1500, fuel: "gasoline" }, { code: "XXDC", cc: 1500, fuel: "diesel" }, { code: "RTQA", cc: 2500, fuel: "hybrid" }], bodyTypes: ["suv"], trims: ["Trend", "Titanium", "ST-Line", "Vignale"] },
  // Dacia
  { make: "Dacia", model: "Sandero III", yearStart: 2020, yearEnd: null, engines: [{ code: "H4D", cc: 1000, fuel: "gasoline" }, { code: "H5Ht", cc: 1300, fuel: "gasoline" }], bodyTypes: ["hatchback"], trims: ["Essential", "Expression", "Extreme", "Stepway"] },
  { make: "Dacia", model: "Duster II", yearStart: 2018, yearEnd: null, engines: [{ code: "H5Ht", cc: 1300, fuel: "gasoline" }, { code: "K9K", cc: 1500, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Essential", "Expression", "Extreme", "Journey"] },
  // Volvo
  { make: "Volvo", model: "XC40", yearStart: 2017, yearEnd: null, engines: [{ code: "B4204T47", cc: 2000, fuel: "gasoline" }, { code: "D4204T14", cc: 2000, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Momentum", "R-Design", "Inscription"] },
  { make: "Volvo", model: "XC60 II", yearStart: 2017, yearEnd: null, engines: [{ code: "B4204T23", cc: 2000, fuel: "gasoline" }, { code: "D4204T14", cc: 2000, fuel: "diesel" }, { code: "B4204T35", cc: 2000, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["Momentum", "R-Design", "Inscription"] },
  { make: "Volvo", model: "V60 II", yearStart: 2018, yearEnd: null, engines: [{ code: "B4204T47", cc: 2000, fuel: "gasoline" }, { code: "D4204T14", cc: 2000, fuel: "diesel" }], bodyTypes: ["wagon"], trims: ["Momentum", "R-Design", "Inscription"] },
  // Nissan
  { make: "Nissan", model: "Qashqai J12", yearStart: 2021, yearEnd: null, engines: [{ code: "HR13DDT", cc: 1300, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["Visia", "Acenta", "N-Connecta", "Tekna"] },
  { make: "Nissan", model: "Juke F16", yearStart: 2019, yearEnd: null, engines: [{ code: "HR10DET", cc: 1000, fuel: "gasoline" }], bodyTypes: ["suv"], trims: ["Visia", "Acenta", "N-Connecta", "Tekna"] },
  // Mazda
  { make: "Mazda", model: "CX-5 KF", yearStart: 2017, yearEnd: null, engines: [{ code: "PE-VPS", cc: 2000, fuel: "gasoline" }, { code: "PY-VPS", cc: 2500, fuel: "gasoline" }, { code: "SH-VPTS", cc: 2200, fuel: "diesel" }], bodyTypes: ["suv"], trims: ["Prime-Line", "Center-Line", "Exclusive-Line", "Signature"] },
  { make: "Mazda", model: "3 BP", yearStart: 2019, yearEnd: null, engines: [{ code: "PE-VPS", cc: 2000, fuel: "gasoline" }, { code: "HF-VPH", cc: 2000, fuel: "gasoline" }], bodyTypes: ["hatchback", "sedan"], trims: ["Prime-Line", "Center-Line", "Exclusive-Line"] },
];

// Add extra makes for manufacturers.csv if not present
const EXTRA_MAKES = ["BMW", "Mercedes-Benz", "Audi", "Renault", "Peugeot", "Citroen", "Toyota", "Fiat", "Opel", "Hyundai", "Kia", "Skoda", "SEAT", "Ford", "Dacia", "Volvo", "Nissan", "Mazda"];

// ─── Part templates per category ───

interface PartTemplate {
  category: string;
  nameTemplate: string;
  oemPrefix: string;
  manufacturers: string[];
  weightRange: [number, number];
}

const PART_TEMPLATES: PartTemplate[] = [
  // Braking
  { category: "brake-pads", nameTemplate: "{mfr} Front Brake Pad Set", oemPrefix: "BP", manufacturers: ["Bosch", "Brembo", "TRW", "ATE", "Ferodo", "Textar", "Mintex", "Pagid", "EBC Brakes"], weightRange: [300, 600] },
  { category: "brake-pads", nameTemplate: "{mfr} Rear Brake Pad Set", oemPrefix: "BPR", manufacturers: ["Bosch", "Brembo", "TRW", "ATE", "Ferodo", "Textar", "Mintex", "Pagid"], weightRange: [250, 500] },
  { category: "brake-discs", nameTemplate: "{mfr} Front Brake Disc", oemPrefix: "BD", manufacturers: ["Bosch", "Brembo", "TRW", "ATE", "Zimmermann", "Meyle"], weightRange: [5000, 12000] },
  { category: "brake-discs", nameTemplate: "{mfr} Rear Brake Disc", oemPrefix: "BDR", manufacturers: ["Bosch", "Brembo", "TRW", "ATE", "Zimmermann", "Meyle"], weightRange: [3000, 8000] },
  { category: "brake-calipers", nameTemplate: "{mfr} Brake Caliper", oemPrefix: "BC", manufacturers: ["TRW", "ATE", "Brembo", "Bosch"], weightRange: [2000, 5000] },
  // Filters
  { category: "oil-filters", nameTemplate: "{mfr} Oil Filter", oemPrefix: "OF", manufacturers: ["Bosch", "Mann-Filter", "Mahle", "Hengst", "Knecht", "UFI", "Purflux"], weightRange: [200, 500] },
  { category: "air-filters", nameTemplate: "{mfr} Air Filter", oemPrefix: "AF", manufacturers: ["Bosch", "Mann-Filter", "Mahle", "Hengst", "Knecht", "UFI"], weightRange: [300, 800] },
  { category: "fuel-filters", nameTemplate: "{mfr} Fuel Filter", oemPrefix: "FF", manufacturers: ["Bosch", "Mann-Filter", "Mahle", "Hengst", "Knecht", "Purflux"], weightRange: [200, 600] },
  { category: "cabin-filters", nameTemplate: "{mfr} Cabin Air Filter", oemPrefix: "CF", manufacturers: ["Bosch", "Mann-Filter", "Mahle", "Hengst", "Knecht", "Corteco"], weightRange: [100, 400] },
  // Engine
  { category: "spark-plugs", nameTemplate: "{mfr} Spark Plug", oemPrefix: "SP", manufacturers: ["Bosch", "NGK", "Denso", "Champion", "Beru"], weightRange: [40, 80] },
  { category: "glow-plugs", nameTemplate: "{mfr} Glow Plug", oemPrefix: "GP", manufacturers: ["Bosch", "Beru", "NGK", "Denso", "Champion"], weightRange: [30, 60] },
  { category: "ignition-coils", nameTemplate: "{mfr} Ignition Coil", oemPrefix: "IC", manufacturers: ["Bosch", "Delphi", "Hella", "Beru", "NGK"], weightRange: [300, 700] },
  { category: "timing-belts", nameTemplate: "{mfr} Timing Belt Kit", oemPrefix: "TB", manufacturers: ["Gates", "Continental", "Dayco", "SKF", "INA"], weightRange: [1000, 3000] },
  { category: "timing-chains", nameTemplate: "{mfr} Timing Chain Kit", oemPrefix: "TC", manufacturers: ["Febi Bilstein", "INA", "SKF"], weightRange: [1500, 4000] },
  { category: "water-pumps", nameTemplate: "{mfr} Water Pump", oemPrefix: "WP", manufacturers: ["SKF", "Gates", "Aisin", "Hepu", "INA", "Meyle"], weightRange: [500, 2000] },
  { category: "thermostats", nameTemplate: "{mfr} Thermostat", oemPrefix: "TH", manufacturers: ["Mahle", "Gates", "Wahler", "Hella"], weightRange: [200, 500] },
  { category: "turbochargers", nameTemplate: "{mfr} Turbocharger", oemPrefix: "TU", manufacturers: ["Garrett", "BorgWarner", "Mahle"], weightRange: [5000, 15000] },
  { category: "gaskets", nameTemplate: "{mfr} Cylinder Head Gasket", oemPrefix: "GK", manufacturers: ["Elring", "Victor Reinz", "Corteco"], weightRange: [100, 500] },
  // Suspension
  { category: "shock-absorbers", nameTemplate: "{mfr} Front Shock Absorber", oemPrefix: "SA", manufacturers: ["Monroe", "KYB", "Bilstein", "Sachs", "Meyle"], weightRange: [2000, 5000] },
  { category: "shock-absorbers", nameTemplate: "{mfr} Rear Shock Absorber", oemPrefix: "SAR", manufacturers: ["Monroe", "KYB", "Bilstein", "Sachs", "Meyle"], weightRange: [1500, 4000] },
  { category: "springs", nameTemplate: "{mfr} Front Coil Spring", oemPrefix: "CS", manufacturers: ["Monroe", "KYB", "Bilstein", "Sachs", "Lesjofors"], weightRange: [2000, 5000] },
  { category: "control-arms", nameTemplate: "{mfr} Control Arm", oemPrefix: "CA", manufacturers: ["Lemfoerder", "Meyle", "Febi Bilstein", "TRW", "Delphi"], weightRange: [1500, 4000] },
  { category: "ball-joints", nameTemplate: "{mfr} Ball Joint", oemPrefix: "BJ", manufacturers: ["Lemfoerder", "Meyle", "TRW", "Febi Bilstein"], weightRange: [300, 800] },
  { category: "tie-rod-ends", nameTemplate: "{mfr} Tie Rod End", oemPrefix: "TR", manufacturers: ["Lemfoerder", "Meyle", "TRW", "Febi Bilstein"], weightRange: [200, 600] },
  { category: "wheel-bearings", nameTemplate: "{mfr} Wheel Bearing Kit", oemPrefix: "WB", manufacturers: ["SKF", "FAG", "NTN", "Koyo", "SNR"], weightRange: [500, 2000] },
  { category: "cv-joints", nameTemplate: "{mfr} CV Joint Kit", oemPrefix: "CV", manufacturers: ["SKF", "FAG", "Lobro", "GKN"], weightRange: [1000, 3000] },
  // Electrical
  { category: "alternators", nameTemplate: "{mfr} Alternator", oemPrefix: "AL", manufacturers: ["Bosch", "Valeo", "Denso", "Hella"], weightRange: [4000, 8000] },
  { category: "starters", nameTemplate: "{mfr} Starter Motor", oemPrefix: "SM", manufacturers: ["Bosch", "Valeo", "Denso", "Hella"], weightRange: [3000, 6000] },
  { category: "batteries", nameTemplate: "{mfr} Car Battery", oemPrefix: "BT", manufacturers: ["Bosch", "Varta", "Exide", "Banner"], weightRange: [12000, 25000] },
  { category: "lambda-sensors", nameTemplate: "{mfr} Lambda Sensor", oemPrefix: "LS", manufacturers: ["Bosch", "Denso", "NGK", "Delphi"], weightRange: [100, 300] },
  // Cooling
  { category: "radiators", nameTemplate: "{mfr} Radiator", oemPrefix: "RD", manufacturers: ["Nissens", "NRF", "Valeo", "Behr", "Hella"], weightRange: [3000, 8000] },
  { category: "cooling-fans", nameTemplate: "{mfr} Cooling Fan", oemPrefix: "FN", manufacturers: ["Nissens", "NRF", "Valeo", "Behr"], weightRange: [2000, 5000] },
  { category: "heater-cores", nameTemplate: "{mfr} Heater Core", oemPrefix: "HC", manufacturers: ["Nissens", "NRF", "Valeo", "Behr"], weightRange: [800, 2000] },
  // Transmission
  { category: "clutch-kits", nameTemplate: "{mfr} Clutch Kit", oemPrefix: "CK", manufacturers: ["LuK", "Sachs", "Valeo", "Aisin"], weightRange: [5000, 12000] },
  { category: "flywheels", nameTemplate: "{mfr} Dual Mass Flywheel", oemPrefix: "FW", manufacturers: ["LuK", "Sachs", "Valeo"], weightRange: [8000, 15000] },
  // Lighting
  { category: "headlights", nameTemplate: "{mfr} Headlight Assembly", oemPrefix: "HL", manufacturers: ["Hella", "Valeo", "Magneti Marelli", "Bosch"], weightRange: [2000, 5000] },
  { category: "tail-lights", nameTemplate: "{mfr} Tail Light Assembly", oemPrefix: "TL", manufacturers: ["Hella", "Valeo", "Magneti Marelli"], weightRange: [500, 2000] },
  { category: "bulbs", nameTemplate: "{mfr} Headlight Bulb H7", oemPrefix: "BL", manufacturers: ["Osram", "Philips", "Bosch", "Hella"], weightRange: [20, 50] },
  // Exhaust
  { category: "catalytic-converters", nameTemplate: "{mfr} Catalytic Converter", oemPrefix: "CC", manufacturers: ["Walker", "Bosal", "MagnaFlow"], weightRange: [3000, 8000] },
  { category: "mufflers", nameTemplate: "{mfr} Exhaust Muffler", oemPrefix: "MF", manufacturers: ["Walker", "Bosal", "Eberspacher"], weightRange: [3000, 10000] },
  { category: "exhaust-pipes", nameTemplate: "{mfr} Exhaust Pipe", oemPrefix: "EP", manufacturers: ["Walker", "Bosal"], weightRange: [1000, 3000] },
  // Sensors
  { category: "sensors", nameTemplate: "{mfr} ABS Sensor", oemPrefix: "ABS", manufacturers: ["Bosch", "Delphi", "Hella", "TRW"], weightRange: [50, 200] },
  { category: "sensors", nameTemplate: "{mfr} Camshaft Position Sensor", oemPrefix: "CPS", manufacturers: ["Bosch", "Delphi", "Hella"], weightRange: [50, 150] },
  { category: "sensors", nameTemplate: "{mfr} Crankshaft Position Sensor", oemPrefix: "CKPS", manufacturers: ["Bosch", "Delphi", "Hella"], weightRange: [50, 200] },
  // Body
  { category: "mirrors", nameTemplate: "{mfr} Side Mirror", oemPrefix: "MR", manufacturers: ["Alkar", "TYC", "Hagus"], weightRange: [500, 1500] },
  { category: "wipers", nameTemplate: "{mfr} Wiper Blade Set", oemPrefix: "WI", manufacturers: ["Bosch", "Valeo", "SWF", "Champion"], weightRange: [200, 500] },
];

// ─── Utility functions ───

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const rng = seededRandom(42);

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function padOem(prefix: string, num: number): string {
  return `${prefix}${String(num).padStart(7, "0")}`;
}

function escapeCsv(val: string | number | null): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvLine(fields: (string | number | null)[]): string {
  return fields.map(escapeCsv).join(",");
}

// ─── Generate vehicles ───

function generateVehicles(): string[] {
  const lines: string[] = ["make_name,model_name,year_start,year_end,engine_code,engine_displacement_cc,fuel_type,body_type,trim,ktype_number"];

  for (const v of VEHICLES) {
    for (const engine of v.engines) {
      for (const body of v.bodyTypes) {
        for (const trim of v.trims) {
          lines.push(csvLine([
            v.make, v.model, v.yearStart, v.yearEnd,
            engine.code, engine.cc, engine.fuel,
            body, trim, v.ktype || "",
          ]));
        }
      }
    }
  }

  return lines;
}

// ─── Generate manufacturers (add missing makes) ───

function generateManufacturers(): string[] {
  const existing = readFileSync(resolve(SEED_DIR, "manufacturers.csv"), "utf-8")
    .split("\n")
    .filter(Boolean);

  const existingNames = new Set(existing.slice(1).map(l => l.split(",")[0]));

  const extra: string[] = [];
  // Add vehicle makes that might not be part suppliers
  for (const make of EXTRA_MAKES) {
    if (!existingNames.has(make)) {
      const countries: Record<string, string> = {
        "BMW": "Germany", "Mercedes-Benz": "Germany", "Audi": "Germany",
        "Renault": "France", "Peugeot": "France", "Citroen": "France",
        "Toyota": "Japan", "Fiat": "Italy", "Opel": "Germany",
        "Hyundai": "South Korea", "Kia": "South Korea", "Skoda": "Czech Republic",
        "SEAT": "Spain", "Ford": "United States", "Dacia": "Romania",
        "Volvo": "Sweden", "Nissan": "Japan", "Mazda": "Japan",
      };
      extra.push(csvLine([make, countries[make] || "", ""]));
    }
  }

  // Add extra part manufacturers
  const extraPartMfrs = [
    ["Garrett", "United States", ""],
    ["BorgWarner", "United States", ""],
    ["Hepu", "Germany", ""],
    ["Wahler", "Germany", ""],
    ["GKN", "United Kingdom", ""],
    ["Lobro", "Germany", ""],
    ["Varta", "Germany", ""],
    ["Exide", "United States", ""],
    ["Banner", "Austria", ""],
    ["Lesjofors", "Sweden", ""],
    ["SNR", "France", ""],
    ["Walker", "United States", ""],
    ["Bosal", "Belgium", ""],
    ["MagnaFlow", "United States", ""],
    ["Eberspacher", "Germany", ""],
    ["Alkar", "Spain", ""],
    ["TYC", "Taiwan", ""],
    ["Hagus", "Germany", ""],
    ["SWF", "Germany", ""],
  ];

  for (const [name, country] of extraPartMfrs) {
    if (!existingNames.has(name!)) {
      extra.push(csvLine([name!, country!, ""]));
    }
  }

  return [...existing, ...extra];
}

// ─── Generate parts ───

interface GeneratedPart {
  oem: string;
  manufacturer: string;
  category: string;
  name: string;
  description: string;
  weight: number;
}

function generateParts(): { lines: string[]; parts: GeneratedPart[] } {
  const lines: string[] = ["oem_number,manufacturer_name,category_slug,name,description,weight_grams,status"];
  const parts: GeneratedPart[] = [];
  const usedOems = new Set<string>();

  let counter = 1000;

  // Read existing parts to avoid duplicates
  const existingParts = readFileSync(resolve(SEED_DIR, "parts.csv"), "utf-8")
    .split("\n")
    .filter(Boolean);
  for (const line of existingParts.slice(1)) {
    const oem = line.split(",")[0]!;
    usedOems.add(oem);
    const fields = line.split(",");
    parts.push({
      oem,
      manufacturer: fields[1]!,
      category: fields[2]!,
      name: fields[3]!,
      description: fields[4] || "",
      weight: parseInt(fields[5] || "0"),
    });
    lines.push(line);
  }

  // For each vehicle x part template combination, generate parts
  const vehiclePlatforms = new Map<string, VehicleSpec[]>();
  for (const v of VEHICLES) {
    const key = v.make;
    if (!vehiclePlatforms.has(key)) vehiclePlatforms.set(key, []);
    vehiclePlatforms.get(key)!.push(v);
  }

  for (const template of PART_TEMPLATES) {
    // Generate parts for each manufacturer in the template
    for (const mfr of template.manufacturers) {
      // Generate 2-5 variants per manufacturer per category
      const variants = randomInt(2, 5);
      for (let v = 0; v < variants; v++) {
        counter++;
        const oem = padOem(template.oemPrefix, counter);
        if (usedOems.has(oem)) continue;
        usedOems.add(oem);

        const weight = randomInt(template.weightRange[0], template.weightRange[1]);
        const name = template.nameTemplate.replace("{mfr}", mfr);
        const suffix = v > 0 ? ` (variant ${v + 1})` : "";
        const descriptions = [
          `High-quality ${template.category.replace(/-/g, " ")} for European vehicles`,
          `Premium OE-quality ${template.category.replace(/-/g, " ")} replacement`,
          `Direct fit ${template.category.replace(/-/g, " ")} for precise OE match`,
          `Performance ${template.category.replace(/-/g, " ")} with extended durability`,
        ];

        const part: GeneratedPart = {
          oem,
          manufacturer: mfr,
          category: template.category,
          name: name + suffix,
          description: pick(descriptions),
          weight,
        };
        parts.push(part);
        lines.push(csvLine([
          oem, mfr, template.category,
          name + suffix,
          part.description,
          weight, "active",
        ]));
      }
    }
  }

  // Generate additional vehicle-specific OE parts to reach 10k+
  const additionalPartsNeeded = Math.max(0, 10500 - parts.length);
  const platformKeys = Array.from(vehiclePlatforms.keys());

  for (let i = 0; i < additionalPartsNeeded; i++) {
    counter++;
    const template = pick(PART_TEMPLATES);
    const mfr = pick(template.manufacturers);
    const platform = pick(platformKeys);
    const oem = padOem(template.oemPrefix, counter);
    if (usedOems.has(oem)) continue;
    usedOems.add(oem);

    const weight = randomInt(template.weightRange[0], template.weightRange[1]);
    const name = `${mfr} ${template.category.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())} for ${platform}`;
    const part: GeneratedPart = {
      oem,
      manufacturer: mfr,
      category: template.category,
      name,
      description: `OE-quality replacement ${template.category.replace(/-/g, " ")} designed for ${platform} vehicles`,
      weight,
    };
    parts.push(part);
    lines.push(csvLine([
      oem, mfr, template.category,
      name, part.description, weight, "active",
    ]));
  }

  return { lines, parts };
}

// ─── Generate compatibility ───

function generateCompatibility(parts: GeneratedPart[], vehicleLines: string[]): string[] {
  const lines: string[] = ["part_oem_number,part_manufacturer,vehicle_make,vehicle_model,vehicle_year_start,engine_code,fitment_notes,quantity_needed,position"];

  // Parse vehicles for matching
  const vehicleRecords = vehicleLines.slice(1).map(l => {
    const f = l.split(",");
    return { make: f[0]!, model: f[1]!, yearStart: f[2]!, engineCode: f[4]! };
  });

  const usedCombos = new Set<string>();
  const positions = ["front", "rear", "left", "right", ""];
  const fitmentNotes = [
    "Direct OE replacement",
    "Exact fit for this application",
    "OEM specification match",
    "Fits all engine variants",
    "Precision engineered for this platform",
  ];

  // For each part, assign 1-8 compatible vehicles
  for (const part of parts) {
    const numVehicles = randomInt(1, 8);
    const assigned = new Set<number>();

    for (let i = 0; i < numVehicles && i < vehicleRecords.length; i++) {
      const idx = Math.floor(rng() * vehicleRecords.length);
      if (assigned.has(idx)) continue;
      assigned.add(idx);

      const v = vehicleRecords[idx]!;
      const key = `${part.oem}|${v.make}|${v.model}|${v.yearStart}|${v.engineCode}`;
      if (usedCombos.has(key)) continue;
      usedCombos.add(key);

      const position = part.category.includes("brake") || part.category.includes("shock") || part.category.includes("spring")
        ? pick(["front", "rear"])
        : part.category.includes("mirror") || part.category.includes("headlight") || part.category.includes("tail")
          ? pick(["left", "right"])
          : "";
      const qty = part.category.includes("pad") || part.category.includes("bulb") || part.category.includes("spark")
        ? randomInt(1, 2)
        : 1;

      lines.push(csvLine([
        part.oem, part.manufacturer,
        v.make, v.model, v.yearStart, v.engineCode,
        pick(fitmentNotes), qty, position,
      ]));
    }
  }

  return lines;
}

// ─── Generate cross references ───

function generateCrossReferences(parts: GeneratedPart[]): string[] {
  const lines: string[] = ["part_oem_number,part_manufacturer,cross_ref_oem_number,cross_ref_manufacturer,cross_ref_type,notes"];

  const usedRefs = new Set<string>();
  const types = ["equivalent", "oem", "replacement", "compatible"];
  let refCounter = 50000;

  // Group parts by category to create cross-references between different manufacturers
  const byCategory = new Map<string, GeneratedPart[]>();
  for (const p of parts) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p);
  }

  for (const [, catParts] of byCategory) {
    // Create cross-references between parts of same category by different manufacturers
    for (let i = 0; i < catParts.length; i++) {
      const part = catParts[i]!;
      const numRefs = randomInt(0, 3);

      for (let r = 0; r < numRefs; r++) {
        const otherIdx = Math.floor(rng() * catParts.length);
        const other = catParts[otherIdx]!;
        if (other.manufacturer === part.manufacturer) continue;

        const key = `${part.oem}|${other.oem}`;
        if (usedRefs.has(key)) continue;
        usedRefs.add(key);
        usedRefs.add(`${other.oem}|${part.oem}`);

        lines.push(csvLine([
          part.oem, part.manufacturer,
          other.oem, other.manufacturer,
          pick(types),
          `Cross-reference for ${part.category.replace(/-/g, " ")}`,
        ]));

        // Also add a random OE reference number
        refCounter++;
        const oeRef = padOem("OE", refCounter);
        lines.push(csvLine([
          part.oem, part.manufacturer,
          oeRef, pick(["Original", part.manufacturer]),
          "oem",
          "Original equipment reference",
        ]));
      }
    }
  }

  return lines;
}

// ─── Main ───

function main() {
  console.log("Generating seed data...\n");

  // Manufacturers
  const mfrLines = generateManufacturers();
  writeFileSync(resolve(SEED_DIR, "manufacturers.csv"), mfrLines.join("\n") + "\n");
  console.log(`Manufacturers: ${mfrLines.length - 1} records`);

  // Categories (keep existing)
  console.log("Categories: kept existing (53 records)");

  // Vehicles
  const vehicleLines = generateVehicles();
  writeFileSync(resolve(SEED_DIR, "vehicles.csv"), vehicleLines.join("\n") + "\n");
  console.log(`Vehicles: ${vehicleLines.length - 1} records`);

  // Parts
  const { lines: partLines, parts } = generateParts();
  writeFileSync(resolve(SEED_DIR, "parts.csv"), partLines.join("\n") + "\n");
  console.log(`Parts: ${partLines.length - 1} records`);

  // Compatibility
  const compatLines = generateCompatibility(parts, vehicleLines);
  writeFileSync(resolve(SEED_DIR, "compatibility.csv"), compatLines.join("\n") + "\n");
  console.log(`Compatibility: ${compatLines.length - 1} records`);

  // Cross references
  const xrefLines = generateCrossReferences(parts);
  writeFileSync(resolve(SEED_DIR, "cross_references.csv"), xrefLines.join("\n") + "\n");
  console.log(`Cross references: ${xrefLines.length - 1} records`);

  console.log("\nSeed data generation complete!");
}

main();
