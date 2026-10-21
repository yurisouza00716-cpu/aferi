export interface Brand {
  id: string;
  name: string;
  /** Domínios registráveis oficiais (conferidos pelo mantenedor nas fontes indicadas). */
  officialDomains: readonly string[];
  /** Palavras distintivas, em minúsculas e ASCII. */
  keywords: readonly string[];
  /** true quando o nome da marca também é uma palavra de uso comum (ex.: "apple"). */
  commonWord?: boolean;
  /** Site oficial usado como fonte da conferência. */
  source: string;
  /** Data da conferência manual (AAAA-MM-DD) ou null se ainda não conferida. */
  lastChecked: string | null;
}

const CHECKED = "2026-10-21";

export const BRANDS: readonly Brand[] = [
  {
    id: "paypal",
    name: "PayPal",
    officialDomains: ["paypal.com"],
    keywords: ["paypal"],
    source: "https://www.paypal.com/br/security",
    lastChecked: CHECKED,
  },
  {
    id: "apple",
    name: "Apple",
    officialDomains: ["apple.com", "icloud.com"],
    keywords: ["apple", "icloud"],
    commonWord: true,
    source: "https://www.apple.com/br/",
    lastChecked: CHECKED,
  },
  {
    id: "google",
    name: "Google",
    officialDomains: ["google.com", "google.com.br", "gmail.com"],
    keywords: ["google", "gmail"],
    source: "https://www.google.com/",
    lastChecked: CHECKED,
  },
  {
    id: "microsoft",
    name: "Microsoft",
    officialDomains: ["microsoft.com", "live.com", "outlook.com", "office.com"],
    keywords: ["microsoft"],
    source: "https://www.microsoft.com/pt-br/",
    lastChecked: CHECKED,
  },
  {
    id: "amazon",
    name: "Amazon",
    officialDomains: ["amazon.com", "amazon.com.br"],
    keywords: ["amazon"],
    commonWord: true,
    source: "https://www.amazon.com.br/",
    lastChecked: CHECKED,
  },
  {
    id: "nubank",
    name: "Nubank",
    officialDomains: ["nubank.com.br"],
    keywords: ["nubank"],
    source: "https://nubank.com.br/",
    lastChecked: CHECKED,
  },
  {
    id: "itau",
    name: "Itaú",
    officialDomains: ["itau.com.br"],
    keywords: ["itau"],
    source: "https://www.itau.com.br/",
    lastChecked: CHECKED,
  },
  {
    id: "bradesco",
    name: "Bradesco",
    officialDomains: ["bradesco.com.br", "banco.bradesco"],
    keywords: ["bradesco"],
    source: "https://banco.bradesco/",
    lastChecked: CHECKED,
  },
  {
    id: "bb",
    name: "Banco do Brasil",
    officialDomains: ["bb.com.br"],
    keywords: ["bancodobrasil"],
    source: "https://www.bb.com.br/",
    lastChecked: CHECKED,
  },
  {
    id: "mercadolivre",
    name: "Mercado Livre / Mercado Pago / Mercado Libre",
    officialDomains: [
      "mercadolivre.com.br",
      "mercadopago.com.br",
      "mercadolivre.com",
      "mercadolibre.com",
      "mercadolibre.com.ar",
      "mercadolibre.com.mx",
    ],
    keywords: ["mercadolivre", "mercadopago", "mercadolibre"],
    source: "https://www.mercadolivre.com.br/",
    lastChecked: CHECKED,
  },
  {
    id: "binance",
    name: "Binance",
    officialDomains: ["binance.com"],
    keywords: ["binance"],
    source: "https://www.binance.com/",
    lastChecked: CHECKED,
  },
  {
    id: "coinbase",
    name: "Coinbase",
    officialDomains: ["coinbase.com"],
    keywords: ["coinbase"],
    source: "https://www.coinbase.com/",
    lastChecked: CHECKED,
  },
];