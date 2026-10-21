import type { NormalizedUrl } from "../url/normalize";
import { splitDomain } from "../url/domain";
import { BRANDS, type Brand } from "../data/brands";
import { asciiSkeletons, editDistance } from "../url/confusables";
import type { Signal } from "./types";

type Script = "latin" | "cyrillic" | "greek" | "other";
type Where = "domain" | "subdomain";
interface Candidate {
  token: string;
  where: Where;
}

const UNCERTAINTY =
  "O Aferi não confirma a identidade do site. Podem existir domínios legítimos parecidos, e a lista de marcas conhecidas é limitada.";

const SCRIPT_NAME: Record<Script, string> = {
  latin: "latino",
  cyrillic: "cirílico",
  greek: "grego",
  other: "outro",
};

function scriptsOf(label: string): Set<Script> {
  const found = new Set<Script>();
  for (const ch of label) {
    if (/\p{Script=Latin}/u.test(ch)) found.add("latin");
    else if (/\p{Script=Cyrillic}/u.test(ch)) found.add("cyrillic");
    else if (/\p{Script=Greek}/u.test(ch)) found.add("greek");
    else if (/\p{L}/u.test(ch)) found.add("other");
  }
  return found;
}

function isAscii(text: string): boolean {
  return /^[\x00-\x7f]*$/.test(text);
}

function placeOf(where: Where): string {
  return where === "domain" ? "no domínio" : "no subdomínio";
}

function matchBrand(
  brand: Brand,
  candidates: Candidate[],
  displayDomain: string,
): Signal | null {
  const own = new Set(brand.keywords);
  // Nome exatamente igual ao da marca é assunto da etapa 2.
  const eligible = candidates.filter((c) => !own.has(c.token));

  // 1) Letras de outro alfabeto que formam o nome da marca.
  for (const c of eligible) {
    if (isAscii(c.token)) continue;
    const kw = brand.keywords.find((k) => asciiSkeletons(c.token).includes(k));
    if (kw) {
      return {
        id: "identity.homograph_brand",
        dimension: "identity",
        severity: "high",
        brandId: brand.id,
        observation: `O nome "${c.token}" ${placeOf(c.where)} usa caracteres que se parecem visualmente com "${kw}", mas não são as mesmas letras. O domínio principal é "${displayDomain}".`,
        inference: `Pode ser uma tentativa de passar por ${brand.name}, embora também possa haver uma explicação legítima.`,
        uncertainty: UNCERTAINTY,
      };
    }
  }

  // 2) Troca de caracteres dentro do alfabeto latino (paypa1, g00gle, rnicrosoft).
  for (const c of eligible) {
    if (!isAscii(c.token)) continue;
    const kw = brand.keywords.find((k) => asciiSkeletons(c.token).includes(k));
    if (kw) {
      return {
        id: "identity.lookalike_brand",
        dimension: "identity",
        severity: "high",
        brandId: brand.id,
        observation: `O nome "${c.token}" ${placeOf(c.where)} é muito parecido com "${kw}" (${brand.name}), com alguns caracteres trocados por outros semelhantes (como 0 por o, 1 por l ou rn por m). O domínio principal é "${displayDomain}".`,
        inference: `Pode ser uma tentativa de passar por ${brand.name}, embora também possa haver uma explicação legítima.`,
        uncertainty: UNCERTAINTY,
      };
    }
  }

  // 3) Erro de digitação (só para nomes de marca com 6+ letras, para reduzir falsos positivos).
  for (const c of eligible) {
    if (!isAscii(c.token) || c.token.length < 5) continue;
    for (const kw of brand.keywords) {
      if (kw.length < 6) continue;
      const d = editDistance(c.token, kw);
      if (d === 1) {
        return {
          id: "identity.typosquat_brand",
          dimension: "identity",
          severity: "medium",
          brandId: brand.id,
          observation: `O nome "${c.token}" ${placeOf(c.where)} difere de "${kw}" (${brand.name}) por apenas um caractere. O domínio principal é "${displayDomain}".`,
          inference:
            "Pequenas variações de nomes conhecidos são usadas para imitar marcas, mas também existem organizações legítimas com nomes parecidos.",
          uncertainty: UNCERTAINTY,
        };
      }
      if (d === 2 && kw.length >= 9) {
        return {
          id: "identity.typosquat_brand",
          dimension: "identity",
          severity: "low",
          brandId: brand.id,
          observation: `O nome "${c.token}" ${placeOf(c.where)} difere de "${kw}" (${brand.name}) por dois caracteres. O domínio principal é "${displayDomain}".`,
          inference:
            "A semelhança pode ser coincidência; nomes longos com pequenas diferenças são comuns entre organizações sem relação.",
          uncertainty: UNCERTAINTY,
        };
      }
    }
  }

  return null;
}

export function detectLookalikeSignals(
  url: NormalizedUrl,
  brands: readonly Brand[] = BRANDS,
): Signal[] {
  if (url.isIp) return [];

  const signals: Signal[] = [];
  const parts = splitDomain(url);

  const rawLabels = url.hostnameUnicode.split(".");
  const uLabels = rawLabels.length === url.labels.length ? rawLabels : url.labels;

  // Alfabetos usados em cada parte do endereço.
  for (const label of uLabels) {
    const scripts = scriptsOf(label);
    if (scripts.size > 1) {
      const nomes = Array.from(scripts).map((s) => SCRIPT_NAME[s]).join(" e ");
      signals.push({
        id: "identity.mixed_scripts",
        dimension: "identity",
        severity: "high",
        observation: `O nome "${label}" mistura letras de alfabetos diferentes (${nomes}).`,
        inference:
          "Misturar alfabetos é uma técnica usada para criar endereços que parecem outros. É raro em nomes legítimos, mas pode ocorrer.",
        uncertainty: UNCERTAINTY,
      });
    } else if (scripts.has("cyrillic") || scripts.has("greek")) {
      signals.push({
        id: "identity.non_latin_script",
        dimension: "identity",
        severity: "low",
        observation: `O nome "${label}" usa apenas letras de um alfabeto não latino.`,
        inference:
          "Isso é normal em sites de países que usam esse alfabeto, mas esses alfabetos também são usados para imitar endereços latinos.",
        uncertainty: UNCERTAINTY,
      });
    }
  }

  // Comparação com as marcas conhecidas.
  const registrable = parts.registrableDomain;
  if (!registrable) return signals;

  const suffixCount = parts.publicSuffix ? parts.publicSuffix.split(".").length : 1;
  const regIndex = uLabels.length - suffixCount - 1;
  if (regIndex < 0) return signals;

  const displayDomain = uLabels.slice(regIndex).join(".");
  const candidates: Candidate[] = [];
  for (let i = 0; i <= regIndex; i++) {
    for (const token of uLabels[i].split("-")) {
      if (token) {
        candidates.push({ token, where: i === regIndex ? "domain" : "subdomain" });
      }
    }
  }

  for (const brand of brands) {
    if (brand.officialDomains.includes(registrable)) continue;
    const signal = matchBrand(brand, candidates, displayDomain);
    if (signal) signals.push(signal);
  }

  return signals;
}