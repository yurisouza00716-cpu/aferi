import type { Signal } from "../signals/types";
import type { NormalizeError } from "../url/normalize";

export type DimensionStatus = "signals_found" | "no_signals_found" | "not_analyzed";

export interface DimensionReport {
  status: DimensionStatus;
  signals: Signal[];
  notes: string[];
}

export type ConclusionLevel =
  | "strong_signals"
  | "moderate_signals"
  | "weak_signals"
  | "no_signals_found";

export interface Report {
  ok: true;
  aferiVersion: string;
  analyzedAt: string;
  target: {
    /** Esquema + domínio + porta. Nunca contém credenciais, caminho, parâmetros ou fragmento. */
    origin: string;
    hostname: string;
    hostnameDisplay: string;
    registrableDomain: string | null;
  };
  privacy: {
    networkRequests: false;
    /** O que existia no endereço digitado e foi deixado de fora do relatório. */
    omittedFromReport: string[];
  };
  dimensions: {
    connection: DimensionReport;
    identity: DimensionReport;
    behavior: DimensionReport;
    reputation: DimensionReport;
  };
  conclusion: {
    level: ConclusionLevel;
    summary: string;
    recommendation: string;
  };
  limitations: string[];
}

export interface ReportFailure {
  ok: false;
  aferiVersion: string;
  analyzedAt: string;
  reason: NormalizeError;
  message: string;
}

export type AnalysisResult = Report | ReportFailure;