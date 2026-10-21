import type { NormalizedUrl, IpKind } from "../url/normalize";
import type { Signal } from "./types";

const UNCERTAINTY =
  "O Aferi não consegue saber a intenção de quem criou o endereço; esta é apenas uma característica observada.";

const IP_KIND_PT: Record<IpKind, string> = {
  public: "público",
  private: "rede privada",
  loopback: "o próprio computador",
  "link-local": "rede local (link-local)",
  unspecified: "endereço não especificado",
  multicast: "multicast",
  reserved: "faixa reservada",
};

export function detectStructureSignals(url: NormalizedUrl): Signal[] {
  const signals: Signal[] = [];
  const nonPublicIp = url.isIp && url.ipKind !== "public";

  // http em equipamento local é normal; só sinalizamos para o resto.
  if (url.scheme === "http" && !nonPublicIp) {
    signals.push({
      id: "connection.no_https",
      dimension: "connection",
      severity: "medium",
      observation: "O endereço usa http, sem criptografia.",
      inference:
        "Informações digitadas nesse site podem ser vistas ou alteradas por terceiros na rede.",
      uncertainty: UNCERTAINTY,
    });
  }

  if (url.port !== null) {
    signals.push({
      id: "connection.non_standard_port",
      dimension: "connection",
      severity: "low",
      observation: `O endereço usa a porta ${url.port}, diferente da porta padrão.`,
      inference:
        "Portas incomuns aparecem em serviços técnicos e de teste, e às vezes em páginas criadas para enganar.",
      uncertainty: UNCERTAINTY,
    });
  }

  if (url.hasCredentials) {
    if (url.credentialsLookLikeDomain) {
      signals.push({
        id: "identity.credentials_look_like_domain",
        dimension: "identity",
        severity: "high",
        observation: `O endereço tem um trecho antes do símbolo @ que parece o nome de um site. O endereço real é o que vem depois do @: "${url.hostnameUnicode}".`,
        inference:
          "Esse formato é usado para fazer o endereço parecer pertencer a outra organização.",
        uncertainty: UNCERTAINTY,
      });
    } else {
      signals.push({
        id: "identity.credentials_in_url",
        dimension: "identity",
        severity: "low",
        observation: "O endereço inclui usuário ou senha antes do símbolo @.",
        inference:
          "Isso é incomum em links comuns e pode ser usado para confundir quem lê o endereço.",
        uncertainty: UNCERTAINTY,
      });
    }
  }

  if (url.isIp) {
    if (url.ipKind === "public") {
      signals.push({
        id: "identity.ip_address",
        dimension: "identity",
        severity: "medium",
        observation: "O endereço usa um número IP em vez de um nome de site.",
        inference:
          "Organizações conhecidas costumam usar nomes de domínio. Endereços numéricos aparecem em páginas enganosas, mas também em equipamentos e serviços técnicos.",
        uncertainty: UNCERTAINTY,
      });
    } else {
      signals.push({
        id: "identity.ip_address_non_public",
        dimension: "identity",
        severity: "info",
        observation: `O endereço é um número IP de uso interno ou reservado (${IP_KIND_PT[url.ipKind ?? "reserved"]}).`,
        inference:
          "Esse tipo de endereço não identifica um site público na internet. O Aferi não faz requisições a ele.",
        uncertainty: UNCERTAINTY,
      });
    }
  }

  return signals;
}