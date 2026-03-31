import { describe, it, expect } from "vitest";
import { parseCsvString } from "../ingestion/csv-parser.js";

describe("parseCsvString", () => {
  it("parses basic CSV with headers", () => {
    const csv = `name,country,website
Bosch,Germany,https://bosch.com
Valeo,France,https://valeo.com`;

    const rows = parseCsvString<Record<string, string>>(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      name: "Bosch",
      country: "Germany",
      website: "https://bosch.com",
    });
    expect(rows[1]).toEqual({
      name: "Valeo",
      country: "France",
      website: "https://valeo.com",
    });
  });

  it("trims whitespace from values", () => {
    const csv = `name , country
 Bosch , Germany `;

    const rows = parseCsvString<Record<string, string>>(csv);
    expect(rows[0].name).toBe("Bosch");
    expect(rows[0].country).toBe("Germany");
  });

  it("handles quoted fields with commas", () => {
    const csv = `name,description
"Brake Pad, Front","High performance, ceramic"`;

    const rows = parseCsvString<Record<string, string>>(csv);
    expect(rows[0].name).toBe("Brake Pad, Front");
    expect(rows[0].description).toBe("High performance, ceramic");
  });

  it("handles empty values", () => {
    const csv = `name,country,website
Bosch,,`;

    const rows = parseCsvString<Record<string, string>>(csv);
    expect(rows[0].name).toBe("Bosch");
    expect(rows[0].country).toBe("");
    expect(rows[0].website).toBe("");
  });

  it("skips empty lines", () => {
    const csv = `name,country
Bosch,Germany

Valeo,France
`;

    const rows = parseCsvString<Record<string, string>>(csv);
    expect(rows).toHaveLength(2);
  });

  it("supports semicolon delimiter", () => {
    const csv = `name;country
Bosch;Germany`;

    const rows = parseCsvString(csv, { delimiter: ";" });
    expect(rows[0]).toEqual({ name: "Bosch", country: "Germany" });
  });

  it("handles relaxed column count", () => {
    const csv = `name,country
Bosch,Germany,extra_field`;

    // Should not throw
    const rows = parseCsvString<Record<string, string>>(csv);
    expect(rows).toHaveLength(1);
  });
});
