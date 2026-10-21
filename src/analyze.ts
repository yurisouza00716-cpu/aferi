import { normalizeUrl, type NormalizeError } from "./url/normalize";
import { splitDomain } from "./url/domain";
import { BRANDS } from "./data/brands";
import { detectBrandSignals } from "./signals/brandImpersonation";
import { detectLookalikeSignals } from "./signals/lookalike";
import { detectStructureSignals } from "./signals/structure";
import type { Dimension, Severity, Signal } from "./signals/types";
import type {
  AnalysisResult,
  ConclusionLevel,
  DimensionReport,
  DimensionStatus,
} from "./report/types";

export const AFERI_VERSION = "0.1.0";

const FAILURE_MESSAGES: Record<NormalizeError, string> = {
  empty: "Nenhum endereço foi informado.",
  too_long: "O endereço é longo demais para ser analisado (limite de 2048 caracteres).",
  control_characters:
    "O endereço contém caracteres de controle invisíveis e não foi analisado.",
  unsupported_scheme: "Só endereços http e https são analisados.",
  invalid_url: "O texto informado não parece ser um endereço de site válido.",
};

const RANK: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3 };

const SUMMARY: Record<ConclusionLevel, string> = {
  strong_signals:
    "Foram encontrados sinais fortes de que o endereço pode estar imitando outra organização ou apresenta características associadas a fraudes. Isso é uma indicação, não uma prova.",
  moderate_signals:
    "Foram encontrados sinais moderados que merecem atenção. Eles podem ter explicações legítimas.",
  weak_signals: "Foram encontrados apenas sinais leves, que podem ser coincidência.",
  no_signals_found:
    "Nenhum sinal de risco foi encontrado pelas verificações disponíveis. Isso não confirma a identidade do site nem garante que ele seja seguro.",
};

const RECOMMENDATION: Record<ConclusionLevel, string> = {
  strong_signals:
    "Não insira senhas, códigos de verificação, dados de pagamento nem frases-semente neste site. Para acessar a organização citada, digite você mesmo o endereço oficial ou use o aplicativo oficial.",
  moderate_signals:
    "Tenha cautela: confirme o endereço oficial por outro caminho antes de inserir qualquer dado.",
  weak_signals:
    "Os sinais são leves; mesmo assim, confira o endereço antes de inserir dados sensíveis.",
  no_signals_found:
    "Mantenha os cuidados de sempre: confira o endereço e desconfie de pedidos inesperados de senha, códigos ou dados de pagamento.",
};

const LIMITATIONS = [
  "Esta versão analisa apenas o texto do endereço: não acessa a página, não verifica certificado e não consulta fontes externas.",
  "A lista de organizações conhecidas é pequena e escrita à mão; pode estar incompleta ou desatualizada.",
  "Nenhuma análise garante segurança absoluta.",
];

function bySeverity(a: Signal, b: Signal): number {
  return RANK[b.severity] - RANK[a.severity];
}

function dimensionReport(
  signals: Signal[],
  dimension: Dimension,
  statusWhenEmpty: DimensionStatus,
  notes: string[],
): DimensionReport {
  const own = signals.filter((s) => s.dimension === dimension).sort(bySeverity);
  return {
    status: own.length > 0 ? "signals_found" : statusWhenEmpty,
    signals: own,
    notes,
  };
}

function levelFor(signals: Signal[]): ConclusionLevel {
  const max = signals.reduce((m, s) => Math.max(m, RANK[s.severity]), 0);
  if (max >= RANK.high) return "strong_signals";
  if (max >= RANK.medium) return "moderate_signals";
  if (max >= RANK.low) return "weak_signals";
  return "no_signals_found";
}

export function analyze(input: string, now: Date = new Date()): AnalysisResult {
  const analyzedAt = now.toISOString();
  const url = normalizeUrl(input);

  if (!url.ok) {
    return {
      ok: false,
      aferiVersion: AFERI_VERSION,
      analyzedAt,
      reason: url.reason,
      message: FAILURE_MESSAGES[url.reason],
    };
  }

  const parts = splitDomain(url);
  const signals: Signal[] = [
    ...detectStructureSignals(url),
    ...detectBrandSignals(url),
    ...detectLookalikeSignals(url),
  ];

  const omitted: string[] = [];
  if (url.hasCredentials) omitted.push("usuário e senha");
  if (url.hasPath) omitted.push("caminho da página");
  if (url.hasQuery) omitted.push("parâmetros do endereço (depois do ?)");
  if (url.hasFragment) omitted.push("fragmento (depois do #)");

  const connectionNotes =
    url.scheme === "https"
      ? [
          "O endereço usa https: a conexão seria criptografada, mas isso não prova que o site seja legítimo.",
          "O certificado não foi verificado: esta versão não faz consultas de rede.",
        ]
      : ["Nenhuma verificação de rede foi feita: esta versão analisa apenas o texto do endereço."];

  const identityHasSignals = signals.some((s) => s.dimension === "identity");
  const identityNotes = identityHasSignals
    ? [
        "A lista de organizações conhecidas é pequena e pode estar incompleta; a ausência de um sinal não confirma a identidade.",
      ]
    : [
        `Nenhum sinal de imitação foi encontrado entre as ${BRANDS.length} organizações da lista do Aferi.`,
        "Isso não confirma a identidade do site: a lista é pequena e pode estar incompleta.",
      ];

  const level = levelFor(signals);

  return {
    ok: true,
    aferiVersion: AFERI_VERSION,
    analyzedAt,
    target: {
      origin: url.origin,
      hostname: url.hostname,
      hostnameDisplay: url.hostnameUnicode,
      registrableDomain: parts.registrableDomain,
    },
    privacy: { networkRequests: false, omittedFromReport: omitted },
    dimensions: {
      connection: dimensionReport(signals, "connection", "not_analyzed", connectionNotes),
      identity: dimensionReport(signals, "identity", "no_signals_found", identityNotes),
      behavior: dimensionReport(signals, "behavior", "not_analyzed", [
        "Esta versão não abre a página, então não analisa redirecionamentos, formulários nem conteúdo.",
      ]),
      reputation: dimensionReport(signals, "reputation", "not_analyzed", [
        "Nenhuma fonte de reputação foi consultada. Consultas externas ficam desligadas por padrão para proteger a privacidade.",
      ]),
    },
    conclusion: {
      level,
      summary: SUMMARY[level],
      recommendation: RECOMMENDATION[level],
    },
    limitations: LIMITATIONS,
  };
}