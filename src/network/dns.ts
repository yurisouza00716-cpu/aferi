import type { NormalizedUrl, IpKind } from "../url/normalize";
import { isLocalName } from "../url/localNames";
import type { Signal } from "../signals/types";
import { classifyAddress } from "./ipGuard";
import { ResolveError, type Resolver, type ResolvedAddress } from "./resolver";

const MAX_ADDRESSES = 20;

export interface NonPublicAddress {
  address: string;
  kind: IpKind | "unknown";
}

export type DnsOutcome =
  | { status: "skipped"; reason: "ip_literal" | "local_name" }
  | { status: "resolved"; addresses: ResolvedAddress[]; nonPublic: NonPublicAddress[] }
  | { status: "not_found" }
  | { status: "timeout" }
  | { status: "failed" };

const UNCERTAINTY =
  "O resultado do DNS é uma fotografia do momento da consulta e pode mudar. Ele não diz quem controla o site.";

const KIND_PT: Record<IpKind | "unknown", string> = {
  public: "público",
  private: "rede privada",
  loopback: "o próprio computador",
  "link-local": "rede local (link-local)",
  unspecified: "endereço não especificado",
  multicast: "multicast",
  reserved: "faixa reservada",
  unknown: "não classificável",
};

export async function checkDns(url: NormalizedUrl, resolver: Resolver): Promise<DnsOutcome> {
  if (url.isIp) return { status: "skipped", reason: "ip_literal" };
  if (isLocalName(url.hostname)) return { status: "skipped", reason: "local_name" };

  try {
    const found = (await resolver(url.hostname)).slice(0, MAX_ADDRESSES);
    if (found.length === 0) return { status: "not_found" };

    const nonPublic: NonPublicAddress[] = [];
    for (const a of found) {
      const kind = classifyAddress(a.address);
      if (kind !== "public") nonPublic.push({ address: a.address, kind: kind ?? "unknown" });
    }
    return { status: "resolved", addresses: found, nonPublic };
  } catch (err) {
    if (err instanceof ResolveError) {
      if (err.kind === "not_found") return { status: "not_found" };
      if (err.kind === "timeout") return { status: "timeout" };
    }
    return { status: "failed" };
  }
}

export function dnsSignals(outcome: DnsOutcome): Signal[] {
  if (outcome.status === "resolved" && outcome.nonPublic.length > 0) {
    const kinds = Array.from(new Set(outcome.nonPublic.map((n) => KIND_PT[n.kind]))).join(", ");
    return [
      {
        id: "connection.dns_resolves_to_non_public",
        dimension: "connection",
        severity: "medium",
        observation: `O nome do site aponta para ${outcome.nonPublic.length} endereço(s) de uso interno ou reservado (${kinds}).`,
        inference:
          "Um site público normalmente não aponta para endereços internos. Isso aparece em configurações internas legítimas e também em técnicas que tentam atingir a rede de quem acessa. Por segurança, o Aferi não se conecta a esses endereços.",
        uncertainty: UNCERTAINTY,
      },
    ];
  }

  if (outcome.status === "not_found") {
    return [
      {
        id: "connection.dns_not_found",
        dimension: "connection",
        severity: "info",
        observation: "O nome do site não foi encontrado no DNS consultado.",
        inference:
          "O endereço pode estar digitado errado, o site pode ter sido removido ou a consulta pode ter falhado. Isso não indica, por si só, fraude.",
        uncertainty: UNCERTAINTY,
      },
    ];
  }

  return [];
}

export function dnsNotes(outcome: DnsOutcome): string[] {
  switch (outcome.status) {
    case "skipped":
      return [
        outcome.reason === "ip_literal"
          ? "O endereço já é um número IP: não houve consulta de DNS."
          : "Nome de uso local: não houve consulta de DNS.",
      ];
    case "resolved": {
      const publicCount = outcome.addresses.length - outcome.nonPublic.length;
      return [
        `O DNS devolveu ${outcome.addresses.length} endereço(s), sendo ${publicCount} público(s). Isso só mostra que o nome existe; não diz quem controla o site.`,
      ];
    }
    case "timeout":
      return ["A consulta de DNS demorou demais e foi interrompida. O resultado não é conclusivo."];
    case "failed":
      return ["A consulta de DNS falhou. O resultado não é conclusivo."];
    case "not_found":
      return [];
  }
}