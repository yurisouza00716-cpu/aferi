import type { Severity } from "../signals/types";
import type {
  AnalysisResult,
  ConclusionLevel,
  DimensionReport,
  DimensionStatus,
} from "./types";

const SEVERITY_LABEL: Record<Severity, string> = {
  info: "INFO",
  low: "BAIXO",
  medium: "MÉDIO",
  high: "ALTO",
};

const STATUS_LABEL: Record<DimensionStatus, string> = {
  signals_found: "sinais encontrados",
  no_signals_found: "nenhum sinal encontrado",
  not_analyzed: "não analisado",
};

const LEVEL_LABEL: Record<ConclusionLevel, string> = {
  strong_signals: "SINAIS FORTES",
  moderate_signals: "SINAIS MODERADOS",
  weak_signals: "SINAIS LEVES",
  no_signals_found: "NENHUM SINAL ENCONTRADO",
};

function wrap(text: string, indent: string, width = 78): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && (indent + line + " " + word).length > width) {
      lines.push(indent + line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  if (line) lines.push(indent + line);
  return lines;
}

function renderDimension(title: string, dim: DimensionReport): string[] {
  const out: string[] = ["", `${title} - ${STATUS_LABEL[dim.status]}`];
  for (const s of dim.signals) {
    out.push(...wrap(`[${SEVERITY_LABEL[s.severity]}] ${s.observation}`, "  "));
    out.push(...wrap(`O que pode indicar: ${s.inference}`, "      "));
    out.push(...wrap(`O que não sabemos: ${s.uncertainty}`, "      "));
  }
  for (const note of dim.notes) out.push(...wrap(`- ${note}`, "  "));
  return out;
}

export function renderText(result: AnalysisResult): string {
  if (!result.ok) {
    return [
      "AFERI - não foi possível analisar a entrada.",
      "",
      ...wrap(result.message, "  "),
    ].join("\n");
  }

  const out: string[] = [];
  out.push("AFERI - análise de endereço");
  out.push("");
  out.push(`Endereço analisado: ${result.target.origin}`);
  if (result.target.hostnameDisplay !== result.target.hostname) {
    out.push(`Como aparece escrito: ${result.target.hostnameDisplay}`);
  }
  out.push(`Domínio principal: ${result.target.registrableDomain ?? "(não se aplica)"}`);

  out.push(...renderDimension("Conexão", result.dimensions.connection));
  out.push(...renderDimension("Identidade", result.dimensions.identity));
  out.push(...renderDimension("Comportamento", result.dimensions.behavior));
  out.push(...renderDimension("Reputação", result.dimensions.reputation));

  out.push("");
  out.push(`Conclusão - ${LEVEL_LABEL[result.conclusion.level]}`);
  out.push(...wrap(result.conclusion.summary, "  "));
  out.push("");
  out.push("Recomendação");
  out.push(...wrap(result.conclusion.recommendation, "  "));

  out.push("");
  out.push("Privacidade");
  if (result.privacy.networkRequests) {
    out.push(...wrap("Requisições de rede feitas nesta análise:", "  "));
    for (const a of result.privacy.networkActivity) out.push(...wrap(`- ${a}`, "    "));
  } else {
    out.push(...wrap("Nenhuma requisição de rede foi feita durante esta análise.", "  "));
  }
  if (result.privacy.omittedFromReport.length > 0) {
    out.push(
      ...wrap(
        `Partes do endereço digitado que não aparecem neste relatório: ${result.privacy.omittedFromReport.join(", ")}.`,
        "  ",
      ),
    );
  }

  out.push("");
  out.push("Limitações");
  for (const l of result.limitations) out.push(...wrap(`- ${l}`, "  "));

  out.push("");
  out.push(`Aferi ${result.aferiVersion} - análise feita em ${result.analyzedAt}`);
  return out.join("\n");
}