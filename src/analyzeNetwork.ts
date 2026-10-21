import { analyze } from "./analyze";
import { normalizeUrl } from "./url/normalize";
import { checkDns, dnsNotes, dnsSignals } from "./network/dns";
import { createSystemResolver, type Resolver } from "./network/resolver";
import type { AnalysisResult } from "./report/types";

export interface NetworkOptions {
  /** Resolvedor de DNS. Por padrão, o do sistema. Os testes usam um falso. */
  resolver?: Resolver;
  now?: Date;
}

/**
 * Análise com verificações de rede, SOMENTE quando chamada de propósito.
 * Nesta versão, a única consulta é o DNS do nome do site: nada além do
 * domínio sai do computador, e nenhuma conexão ao site é feita.
 */
export async function analyzeWithNetwork(
  input: string,
  options: NetworkOptions = {},
): Promise<AnalysisResult> {
  const now = options.now ?? new Date();
  const url = normalizeUrl(input);
  if (!url.ok) return analyze(input, now);

  const outcome = await checkDns(url, options.resolver ?? createSystemResolver());
  const queried = outcome.status !== "skipped";

  return analyze(input, now, {
    signals: dnsSignals(outcome),
    connectionNotes: dnsNotes(outcome),
    activity: queried
      ? [`Consulta de DNS do nome "${url.hostname}" ao resolvedor do sistema (apenas o nome do domínio).`]
      : [],
  });
}