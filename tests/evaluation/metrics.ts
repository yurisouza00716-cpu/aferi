export interface Counts {
  /** Suspeito e marcado (acerto). */
  tp: number;
  /** Legítimo e marcado (falso positivo). */
  fp: number;
  /** Suspeito e não marcado (falso negativo). */
  fn: number;
  /** Legítimo e não marcado (acerto). */
  tn: number;
}

export interface Metrics {
  precision: number | null;
  recall: number | null;
  falsePositiveRate: number | null;
  falseNegativeRate: number | null;
  accuracy: number | null;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export function computeMetrics(c: Counts): Metrics {
  return {
    precision: ratio(c.tp, c.tp + c.fp),
    recall: ratio(c.tp, c.tp + c.fn),
    falsePositiveRate: ratio(c.fp, c.fp + c.tn),
    falseNegativeRate: ratio(c.fn, c.fn + c.tp),
    accuracy: ratio(c.tp + c.tn, c.tp + c.fp + c.fn + c.tn),
  };
}