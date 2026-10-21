export type Severity = "info" | "low" | "medium" | "high";

export interface Signal {
  /** Identificador estável, ex.: "identity.brand_in_subdomain". */
  id: string;
  dimension: "identity";
  severity: Severity;
  brandId?: string;
  /** O que foi efetivamente observado. */
  observation: string;
  /** O que isso pode indicar (interpretação, não fato). */
  inference: string;
  /** O que o Aferi não consegue afirmar. */
  uncertainty: string;
}