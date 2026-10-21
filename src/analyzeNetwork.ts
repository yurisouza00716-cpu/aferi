import { analyze } from "./analyze";
import { normalizeUrl } from "./url/normalize";
import { checkDns, dnsNotes, dnsSignals } from "./network/dns";
import { createSystemResolver, type Resolver } from "./network/resolver";
import { createSystemTlsProbe, type TlsProbe } from "./network/tls";
import { checkTls, tlsAttempted, tlsNotes, tlsSignals, TLS_ACTIVITY } from "./network/tlsCheck";
import type { Signal } from "./signals/types";
import type { AnalysisResult } from "./report/types";

export interface NetworkOptions {
  /** Resolvedor de DNS. Por padrão, o do sistema. Os testes usam um falso. */
  resolver?: Resolver;
  /** Ler o certificado TLS do site (--tls). Desligado por padrão. */
  tls?: boolean;
  /** Sonda TLS. Por padrão, a real. Os testes usam uma falsa. */
  tlsProbe?: TlsProbe;
  now?: Date;
}

const SCOPE_DNS =
  "Esta versão analisa o texto do endereço e, quando solicitado, consulta o DNS do domínio; não acessa a página, não verifica certificado e não consulta fontes de reputação.";

const SCOPE_TLS =
  "Esta versão analisa o texto do endereço e, quando solicitado, consulta o DNS do domínio e lê o certificado TLS do site, sem abrir a página; não analisa o conteúdo, não verifica a revogação do certificado e não consulta fontes de reputação.";

/**
 * Análise com verificações de rede, SOMENTE quando chamada de propósito.
 * - DNS: só o nome do domínio é enviado ao resolvedor do sistema.
 * - TLS (opcional): conexão ao IP já validado como público, porta 443, apenas
 *   para ler o certificado. Nenhuma requisição HTTP é enviada.
 */
export async function analyzeWithNetwork(
  input: string,
  options: NetworkOptions = {},
): Promise<AnalysisResult> {
  const now = options.now ?? new Date();
  const url = normalizeUrl(input);
  if (!url.ok) return analyze(input, now);

  const tlsRequested = options.tls === true;
  const activity: string[] = [];
  const signals: Signal[] = [];
  const notes: string[] = [];

  const dns = await checkDns(url, options.resolver ?? createSystemResolver());
  if (dns.status !== "skipped") {
    activity.push(
      `Consulta de DNS do nome "${url.hostname}" ao resolvedor do sistema (apenas o nome do domínio).`,
    );
  }
  signals.push(...dnsSignals(dns));
  notes.push(...dnsNotes(dns));

  if (tlsRequested) {
    const tls = await checkTls(url, dns, options.tlsProbe ?? createSystemTlsProbe());
    if (tlsAttempted(tls)) activity.push(TLS_ACTIVITY);
    signals.push(...tlsSignals(tls));
    notes.push(...tlsNotes(tls));
  }

  return analyze(input, now, {
    signals,
    connectionNotes: notes,
    activity,
    scope: tlsRequested ? SCOPE_TLS : SCOPE_DNS,
    tlsRequested,
  });
}