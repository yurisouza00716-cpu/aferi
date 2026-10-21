import type { NormalizedUrl } from "../url/normalize";
import { isLocalName } from "../url/localNames";
import type { Severity, Signal } from "../signals/types";
import type { DnsOutcome } from "./dns";
import { sanitizeText } from "./certificate";
import { DEFAULT_TLS_TIMEOUT_MS, TlsProbeError, type TlsProbe, type TlsProbeResult } from "./tls";

export type TlsSkipReason =
  | "not_https"
  | "ip_address"
  | "local_name"
  | "non_standard_port"
  | "dns_unavailable"
  | "non_public_address";

export type TlsOutcome =
  | { status: "skipped"; reason: TlsSkipReason }
  | { status: "checked"; result: TlsProbeResult }
  | { status: "timeout" }
  | { status: "refused" }
  | { status: "failed" }
  | { status: "blocked" };

export const TLS_ACTIVITY =
  "Conexão TLS ao servidor do site (porta 443) apenas para ler o certificado; nenhuma requisição HTTP é enviada e a página não é aberta. O servidor do site pode ver o seu endereço IP, e o nome do domínio é enviado no início da conexão.";

/** true quando houve (ou pode ter havido) uma conexão de rede ao site. */
export function tlsAttempted(outcome: TlsOutcome): boolean {
  return (
    outcome.status === "checked" ||
    outcome.status === "timeout" ||
    outcome.status === "refused" ||
    outcome.status === "failed"
  );
}

function skip(reason: TlsSkipReason): TlsOutcome {
  return { status: "skipped", reason };
}

export async function checkTls(
  url: NormalizedUrl,
  dns: DnsOutcome,
  probe: TlsProbe,
  timeoutMs: number = DEFAULT_TLS_TIMEOUT_MS,
): Promise<TlsOutcome> {
  if (url.scheme !== "https") return skip("not_https");
  if (url.isIp) return skip("ip_address");
  if (isLocalName(url.hostname)) return skip("local_name");
  // Por precaução, só a porta 443: evita usar o Aferi para testar portas arbitrárias.
  if (url.port !== null) return skip("non_standard_port");
  if (dns.status !== "resolved") return skip("dns_unavailable");
  // Guarda SSRF: se QUALQUER endereço não for público, não conecta.
  if (dns.nonPublic.length > 0) return skip("non_public_address");

  // IPv4 primeiro: muitas redes domésticas não têm IPv6.
  const target = [...dns.addresses].sort((a, b) => a.family - b.family)[0];
  if (!target) return skip("dns_unavailable");

  try {
    const result = await probe({
      ip: target.address,
      port: 443,
      servername: url.hostname,
      timeoutMs,
    });
    return { status: "checked", result };
  } catch (err) {
    if (err instanceof TlsProbeError) {
      if (err.kind === "timeout") return { status: "timeout" };
      if (err.kind === "refused") return { status: "refused" };
      if (err.kind === "blocked") return { status: "blocked" };
    }
    return { status: "failed" };
  }
}

const UNCERTAINTY =
  "O Aferi usa a lista de autoridades certificadoras do Node.js, que pode diferir da do seu navegador ou sistema, e redes com inspeção de tráfego podem alterar certificados. O resultado é uma fotografia do momento.";

function make(id: string, severity: Severity, observation: string, inference: string): Signal {
  return { id, dimension: "connection", severity, observation, inference, uncertainty: UNCERTAINTY };
}

function safeCode(code: string | null): string | null {
  return code !== null && /^[A-Z0-9_]{1,64}$/.test(code) ? code : null;
}

export function tlsSignals(outcome: TlsOutcome): Signal[] {
  if (outcome.status !== "checked") return [];
  const r = outcome.result;

  if (r.certificate === null) {
    return [
      make(
        "connection.tls_no_certificate",
        "low",
        "O servidor não apresentou um certificado legível.",
        "Isso pode ser um problema de configuração do servidor ou uma conexão que não usa TLS de forma comum.",
      ),
    ];
  }

  if (r.authorized) return [];

  switch (r.authorizationError) {
    case "CERT_HAS_EXPIRED":
      return [
        make(
          "connection.tls_certificate_expired",
          "medium",
          "O certificado do site está fora do prazo de validade (expirado).",
          "Sites mantidos de forma ativa costumam renovar certificados. Um certificado expirado pode indicar abandono ou descuido, mas não prova fraude.",
        ),
      ];
    case "CERT_NOT_YET_VALID":
      return [
        make(
          "connection.tls_certificate_not_yet_valid",
          "medium",
          "O certificado do site ainda não entrou em vigor.",
          "Isso pode indicar erro de configuração do site ou o relógio do seu computador desajustado.",
        ),
      ];
    case "ERR_TLS_CERT_ALTNAME_INVALID":
      return [
        make(
          "connection.tls_name_mismatch",
          "medium",
          "O certificado apresentado não inclui o nome do site consultado.",
          "Isso acontece por erro de configuração e também quando outro servidor responde no lugar do site.",
        ),
      ];
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "SELF_SIGNED_CERT_IN_CHAIN":
      return [
        make(
          "connection.tls_self_signed",
          "medium",
          "O certificado foi assinado pelo próprio site, e não por uma autoridade certificadora conhecida.",
          "Navegadores alertam sobre isso. É comum em equipamentos e ambientes de teste, mas incomum em sites públicos de organizações conhecidas.",
        ),
      ];
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "UNABLE_TO_GET_ISSUER_CERT":
    case "UNABLE_TO_GET_ISSUER_CERT_LOCALLY":
    case "CERT_UNTRUSTED":
      return [
        make(
          "connection.tls_untrusted_chain",
          "low",
          "O Aferi não conseguiu confirmar a cadeia de certificação até uma autoridade confiável.",
          "Pode ser configuração incompleta do servidor, uma autoridade pouco comum ou um certificado inadequado.",
        ),
      ];
    default: {
      const code = safeCode(r.authorizationError);
      return [
        make(
          "connection.tls_verification_failed",
          "low",
          code
            ? `A verificação do certificado falhou (código: ${code}).`
            : "A verificação do certificado falhou.",
          "O certificado não foi aceito pela verificação padrão. O motivo exato pode ter explicação legítima.",
        ),
      ];
    }
  }
}

const SKIP_NOTES: Record<TlsSkipReason, string> = {
  not_https: "O endereço usa http: não há certificado para verificar.",
  ip_address: "O endereço é um número IP: o certificado não foi verificado.",
  local_name: "Nome de uso local: o certificado não foi verificado.",
  non_standard_port:
    "O endereço usa uma porta diferente da padrão: por precaução, o certificado só é verificado na porta 443.",
  dns_unavailable:
    "O nome do site não pôde ser resolvido: o certificado não foi verificado.",
  non_public_address:
    "O nome do site aponta para endereço interno ou reservado: por segurança, o Aferi não se conectou.",
};

export function tlsNotes(outcome: TlsOutcome): string[] {
  switch (outcome.status) {
    case "skipped":
      return [SKIP_NOTES[outcome.reason]];
    case "timeout":
      return ["A conexão ao servidor demorou demais e foi interrompida. O resultado não é conclusivo."];
    case "refused":
      return ["O servidor recusou a conexão na porta 443. O resultado não é conclusivo."];
    case "failed":
      return [
        "Não foi possível concluir a conexão segura (o servidor pode não usar TLS, ou a conexão falhou). O resultado não é conclusivo.",
      ];
    case "blocked":
      return ["A conexão foi bloqueada por precaução (endereço não público)."];
    case "checked": {
      const r = outcome.result;
      if (r.certificate === null) {
        return ["A conexão segura foi estabelecida, mas o servidor não apresentou um certificado legível."];
      }
      const notes: string[] = [];
      if (r.authorized) {
        notes.push(
          "A conexão segura foi estabelecida e o certificado foi aceito pelas autoridades certificadoras confiáveis do Node.js, com o nome do site presente nele. Isso não prova que o site seja legítimo: certificados válidos também são obtidos por páginas fraudulentas.",
        );
      }
      const c = r.certificate;
      const issuer = c.issuer ? sanitizeText(c.issuer) : null;
      const from = c.validFrom ? c.validFrom.slice(0, 10) : null;
      const to = c.validTo ? c.validTo.slice(0, 10) : null;
      if (issuer || (from && to)) {
        notes.push(
          `Certificado${issuer ? ` emitido por "${issuer}"` : ""}${from && to ? `, válido de ${from} até ${to}` : ""}.`,
        );
      }
      notes.push("A revogação do certificado não foi verificada.");
      return notes;
    }
  }
}