import { describe, expect, it } from "vitest";
import {
  calcMixSaturation,
  calcMonoSaturation,
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
