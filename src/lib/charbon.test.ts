import { describe, expect, it } from "vitest";
import {
  FILTER_REFERENCES,
  GROUPS,
  calcMixSaturation,
  calcMonoSaturation,
  getFilterReferenceById,
  parseNumberLoose,
  statusFromSaturation
} from "./charbon";

describe("parseNumberLoose", () => {
  it("parses dot and comma decimals", () => {
    expect(parseNumberLoose("8.5")).toBeCloseTo(8.5);
    expect(parseNumberLoose("8,5")).toBeCloseTo(8.5);
  });

  it("returns NaN on invalid", () => {
    expect(Number.isNaN(parseNumberLoose("abc"))).toBe(true);
  });
});

describe("calcMonoSaturation", () => {
  it("computes saturation from gain and capacity", () => {
    const r = calcMonoSaturation(1, 10, 0.1);
    expect(r.capaciteMaxKg).toBeCloseTo(1);
    expect(r.saturationPct).toBeCloseTo(100);
  });
});

describe("calcMixSaturation", () => {
  it("computes conservative >= estimated when averages differ", () => {
    const r = calcMixSaturation(1, 10, [
      { avg: 0.35, share01: 0.5 },
      { avg: 0.07, share01: 0.5 }
    ]);
    expect(r.conservative.saturationPct).toBeGreaterThanOrEqual(
      r.estimated.saturationPct
    );
  });
});

describe("statusFromSaturation", () => {
  it("returns the correct status buckets", () => {
    expect(statusFromSaturation(50).label).toBe("OK");
    expect(statusFromSaturation(72).label).toBe("A surveiller");
    expect(statusFromSaturation(80).label).toBe("A remplacer");
    expect(statusFromSaturation(120).label).toBe("Sature");
  });
});

describe("filter references and groups", () => {
  it("returns selected filter metadata (not EPUREX 1000) for known ids", () => {
    const can2600 = getFilterReferenceById("CAN_2600");
    expect(can2600.id).toBe("CAN_2600");
    expect(can2600.poidsNeufBrutKg).toBeCloseTo(3.5);
    expect(can2600.poidsCharbonNetKg).toBeCloseTo(2.1);
  });

  it("computes different capacities depending on selected cartridge", () => {
    const avg = GROUPS["1"].avg;
    const epurex = calcMonoSaturation(1, FILTER_REFERENCES.EPUREX_1000.poidsCharbonNetKg, avg);
    const can1500 = calcMonoSaturation(1, FILTER_REFERENCES.CAN_1500.poidsCharbonNetKg, avg);
    expect(epurex.capaciteMaxKg).toBeGreaterThan(can1500.capaciteMaxKg);
  });

  it("keeps clear group distinction (G1 > G2 > G3 > G4)", () => {
    expect(GROUPS["1"].avg).toBeGreaterThan(GROUPS["2"].avg);
    expect(GROUPS["2"].avg).toBeGreaterThan(GROUPS["3"].avg);
    expect(GROUPS["3"].avg).toBeGreaterThanOrEqual(GROUPS["4"].avg);
    expect(GROUPS["4"].avg).toBe(0);
  });
});
