export interface Brand {
  id: string;
  name: string;
  /** Domínios registráveis oficiais conhecidos (lista incompleta por natureza). */
  officialDomains: readonly string[];
  /** Palavras distintivas, em minúsculas e ASCII. */
  keywords: readonly string[];
  /** true quando o nome da marca também é uma palavra de uso comum (ex.: "apple"). */
  commonWord?: boolean;
  /** De onde veio a informação. */
  source: string;
  /** Data da última conferência manual (AAAA-MM-DD) ou null se ainda não conferida. */
  lastChecked: string | null;
}

const SEED =
  "Lista semente escrita à mão; conferir no site oficial da organização antes de depender dela.";

export const BRANDS: readonly Brand[] = [
  { id: "paypal", name: "PayPal", officialDomains: ["paypal.com"], keywords: ["paypal"], source: SEED, lastChecked: null },
  { id: "apple", name: "Apple", officialDomains: ["apple.com", "icloud.com"], keywords: ["apple", "icloud"], commonWord: true, source: SEED, lastChecked: null },
  { id: "google", name: "Google", officialDomains: ["google.com", "google.com.br", "gmail.com"], keywords: ["google", "gmail"], source: SEED, lastChecked: null },
  { id: "microsoft", name: "Microsoft", officialDomains: ["microsoft.com", "microsoftonline.com", "live.com", "office.com"], keywords: ["microsoft"], source: SEED, lastChecked: null },
  { id: "amazon", name: "Amazon", officialDomains: ["amazon.com", "amazon.com.br"], keywords: ["amazon"], commonWord: true, source: SEED, lastChecked: null },
  { id: "nubank", name: "Nubank", officialDomains: ["nubank.com.br"], keywords: ["nubank"], source: SEED, lastChecked: null },
  { id: "itau", name: "Itaú", officialDomains: ["itau.com.br"], keywords: ["itau"], source: SEED, lastChecked: null },
  { id: "bradesco", name: "Bradesco", officialDomains: ["bradesco.com.br"], keywords: ["bradesco"], source: SEED, lastChecked: null },
  { id: "bb", name: "Banco do Brasil", officialDomains: ["bb.com.br"], keywords: ["bancodobrasil"], source: SEED, lastChecked: null },
  { id: "mercadolivre", name: "Mercado Livre / Mercado Pago / Mercado Libre", officialDomains: ["mercadolivre.com.br", "mercadolivre.com", "mercadopago.com.br", "mercadolibre.com", "mercadolibre.com.ar", "mercadolibre.com.mx"], keywords: ["mercadolivre", "mercadopago", "mercadolibre"], source: SEED, lastChecked: null },
  { id: "binance", name: "Binance", officialDomains: ["binance.com"], keywords: ["binance"], source: SEED, lastChecked: null },
  { id: "coinbase", name: "Coinbase", officialDomains: ["coinbase.com"], keywords: ["coinbase"], source: SEED, lastChecked: null },
];