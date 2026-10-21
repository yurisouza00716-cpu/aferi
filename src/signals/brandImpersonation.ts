import type { NormalizedUrl } from "../url/normalize";
import { splitDomain } from "../url/domain";
import { BRANDS, type Brand } from "../data/brands";
import type { Signal } from "./types";

const UNCERTAINTY =
  "O Aferi não confirma a identidade do site. A lista de domínios oficiais é limitada e pode estar incompleta.";

/**
 * Palavras que costumam acompanhar o nome de uma marca em endereços enganosos.
 * Quando a marca tem nome de uso comum (ex.: "apple"), só a presença de uma
 * dessas palavras eleva o sinal de leve para moderado.
 */
const TRIGGER_WORDS: ReadonlySet<string> = new Set([
  "login", "signin", "secure", "security", "support", "verify", "verification",
  "account", "wallet", "update", "help", "pay", "payment", "confirm", "auth", "access",
  "seguro", "seguranca", "acesso", "conta", "verificacao", "atualizar", "atualizacao",
  "suporte", "ajuda", "cadastro", "entrar", "pagamento", "confirmar",
]);

function tokens(label: string): string[] {
  return label.split("-").filter(Boolean);
}

/** Verifica se a sequência `run` aparece de forma contígua dentro de `labels`. */
function containsRun(labels: readonly string[], run: readonly string[]): boolean {
  for (let i = 0; i + run.length <= labels.length; i++) {
    if (run.every((part, j) => labels[i + j] === part)) return true;
  }
  return false;
}

export function detectBrandSignals(
  url: NormalizedUrl,
  brands: readonly Brand[] = BRANDS,
): Signal[] {
  const parts = splitDomain(url);
  const registrable = parts.registrableDomain;
  if (!registrable) return [];

  const signals: Signal[] = [];

  for (const brand of brands) {
    // Domínio oficial conhecido: nada a sinalizar.
    if (brand.officialDomains.includes(registrable)) continue;

    // 1) Domínio oficial inteiro aparecendo dentro dos subdomínios.
    const chained = brand.officialDomains.find((d) =>
      containsRun(parts.subdomainLabels, d.split(".")),
    );
    if (chained) {
      signals.push({
        id: "identity.official_domain_in_subdomain",
        dimension: "identity",
        severity: "high",
        brandId: brand.id,
        observation: `O endereço contém "${chained}" antes do domínio principal "${registrable}".`,
        inference: `Isso pode levar a pensar que o site pertence a ${brand.name}, mas o que define o dono é o domínio principal ("${registrable}"), não o que vem antes dele.`,
        uncertainty: UNCERTAINTY,
      });
      continue;
    }

    // 2) Nome da marca como palavra nos subdomínios.
    const subTokens = parts.subdomainLabels.flatMap(tokens);
    const inSub = brand.keywords.find((k) => subTokens.includes(k));
    if (inSub) {
      signals.push({
        id: "identity.brand_in_subdomain",
        dimension: "identity",
        severity: "medium",
        brandId: brand.id,
        observation: `O nome "${inSub}" aparece no subdomínio, mas o domínio principal é "${registrable}", que não consta entre os domínios oficiais conhecidos de ${brand.name}.`,
        inference: `O nome da marca pode estar sendo usado para sugerir uma ligação com ${brand.name}.`,
        uncertainty: UNCERTAINTY,
      });
      continue;
    }

    // 3) Nome da marca como palavra no próprio nome do domínio.
    const domTokens = parts.registrableLabel ? tokens(parts.registrableLabel) : [];
    const inDom = brand.keywords.find((k) => domTokens.includes(k));
    if (inDom) {
      const hasTrigger = domTokens.some((t) => TRIGGER_WORDS.has(t));
      const soft = brand.commonWord === true && !hasTrigger;
      signals.push({
        id: "identity.brand_in_domain_name",
        dimension: "identity",
        severity: soft ? "low" : "medium",
        brandId: brand.id,
        observation: `O nome "${inDom}" aparece no domínio "${registrable}", que não consta entre os domínios oficiais conhecidos de ${brand.name}.`,
        inference: soft
          ? `"${inDom}" também é uma palavra de uso comum, então o endereço pode não ter relação nenhuma com ${brand.name}.`
          : `O domínio pode estar tentando se associar a ${brand.name}, ou pode ser um domínio legítimo que ainda não está na lista do Aferi.`,
        uncertainty: UNCERTAINTY,
      });
    }
  }

  return signals;
}