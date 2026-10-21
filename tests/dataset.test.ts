import { describe, it, expect } from "vitest";
import { DATASET } from "./fixtures/dataset";
import { analyze } from "../src/analyze";
import { computeMetrics } from "./evaluation/metrics";

describe("conjunto de avaliação", () => {
  it("não tem endereços repetidos", () => {
    const urls = DATASET.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("todas as entradas têm rótulo válido e nota", () => {
    for (const s of DATASET) {
      expect(["legitimate", "suspicious", "ambiguous"]).toContain(s.label);
      expect(s.note.length).toBeGreaterThan(0);
    }
  });

  it("todos os endereços podem ser analisados", () => {
    for (const s of DATASET) {
      expect(analyze(s.url).ok).toBe(true);
    }
  });

  it("tem exemplos suficientes de cada rótulo", () => {
    const conta = (l: string) => DATASET.filter((s) => s.label === l).length;
    expect(conta("legitimate")).toBeGreaterThanOrEqual(15);
    expect(conta("suspicious")).toBeGreaterThanOrEqual(15);
    expect(conta("ambiguous")).toBeGreaterThanOrEqual(3);
  });
});

describe("computeMetrics", () => {
  it("calcula as fórmulas corretamente", () => {
    const m = computeMetrics({ tp: 8, fp: 2, fn: 2, tn: 8 });
    expect(m.precision).toBeCloseTo(0.8);
    expect(m.recall).toBeCloseTo(0.8);
    expect(m.falsePositiveRate).toBeCloseTo(0.2);
    expect(m.falseNegativeRate).toBeCloseTo(0.2);
    expect(m.accuracy).toBeCloseTo(0.8);
  });

  it("devolve null quando não há como calcular", () => {
    const m = computeMetrics({ tp: 0, fp: 0, fn: 0, tn: 0 });
    expect(m.precision).toBeNull();
    expect(m.recall).toBeNull();
    expect(m.falsePositiveRate).toBeNull();
    expect(m.falseNegativeRate).toBeNull();
    expect(m.accuracy).toBeNull();
  });
});