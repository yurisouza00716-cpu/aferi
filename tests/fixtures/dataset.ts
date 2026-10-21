export type Label = "legitimate" | "suspicious" | "ambiguous";

export interface Sample {
  url: string;
  label: Label;
  note: string;
}

/**
 * Conjunto de avaliação escrito à mão pelo projeto. Ele é pequeno e enviesado
 * (as regras e os exemplos foram escritos pelas mesmas pessoas), então serve
 * como linha de base de regressão, não como medida de desempenho real.
 * Os endereços são apenas texto: nunca devem ser visitados.
 */
export const DATASET: readonly Sample[] = [
  // ---- Legítimos (esperado: sem sinais moderados ou fortes) ----
  { url: "https://www.paypal.com/signin", label: "legitimate", note: "Domínio oficial de marca da lista." },
  { url: "https://www.google.com.br/search?q=teste", label: "legitimate", note: "Domínio oficial, com parâmetros." },
  { url: "https://mail.google.com", label: "legitimate", note: "Subdomínio de domínio oficial." },
  { url: "https://login.microsoftonline.com", label: "legitimate", note: "Domínio oficial secundário da Microsoft." },
  { url: "https://www.nubank.com.br", label: "legitimate", note: "Domínio oficial." },
  { url: "https://www.itau.com.br", label: "legitimate", note: "Domínio oficial." },
  { url: "https://www.bb.com.br", label: "legitimate", note: "Domínio oficial." },
  { url: "https://www.bradesco.com.br", label: "legitimate", note: "Domínio oficial." },
  { url: "https://www.amazon.com.br", label: "legitimate", note: "Domínio oficial." },
  { url: "https://www.mercadolivre.com.br", label: "legitimate", note: "Domínio oficial." },
  { url: "https://www.mercadolibre.com.ar", label: "legitimate", note: "Mercado Libre (Argentina); a uma letra de 'mercadolivre'." },
  { url: "https://www.binance.com", label: "legitimate", note: "Domínio oficial." },
  { url: "https://www.coinbase.com", label: "legitimate", note: "Domínio oficial." },
  { url: "https://www.apple.com", label: "legitimate", note: "Domínio oficial." },
  { url: "https://pt.wikipedia.org/wiki/Brasil", label: "legitimate", note: "Site conhecido, fora da lista de marcas." },
  { url: "https://github.com", label: "legitimate", note: "Site conhecido, fora da lista de marcas." },
  { url: "https://www.mozilla.org", label: "legitimate", note: "Site conhecido, fora da lista de marcas." },
  { url: "https://www.uol.com.br", label: "legitimate", note: "Site conhecido, fora da lista de marcas." },
  { url: "https://www.globo.com", label: "legitimate", note: "Site conhecido, fora da lista de marcas." },
  { url: "https://www.caixa.gov.br", label: "legitimate", note: "Site conhecido com sufixo gov.br." },
  { url: "https://web.whatsapp.com", label: "legitimate", note: "Subdomínio de site conhecido, fora da lista." },
  { url: "https://www.gov.br", label: "legitimate", note: "Sufixo composto do Brasil." },
  { url: "https://exemplo.com.br", label: "legitimate", note: "Domínio genérico sem relação com marcas." },
  { url: "https://pineapple.com", label: "legitimate", note: "Contém 'apple' dentro de outra palavra." },
  { url: "https://www.applebees.com", label: "legitimate", note: "Contém 'apple' dentro de outra palavra." },
  { url: "https://goal.com", label: "legitimate", note: "Parecido com 'google' só de longe." },
  { url: "http://192.168.0.1", label: "legitimate", note: "Equipamento de rede local; http é normal aí." },
  { url: "http://localhost:3000", label: "legitimate", note: "Servidor local de desenvolvimento." },
  { url: "http://app.localhost:8080", label: "legitimate", note: "Nome reservado para uso local." },
  { url: "http://meu-roteador.local", label: "legitimate", note: "Equipamento na rede local." },

  // ---- Suspeitos (esperado: sinais moderados ou fortes) ----
  { url: "https://paypa1.com", label: "suspicious", note: "Número 1 no lugar de 'l'." },
  { url: "https://paypal.com.login-seguro.xyz", label: "suspicious", note: "Domínio oficial dentro dos subdomínios." },
  { url: "https://paypal.com@site-falso.xyz", label: "suspicious", note: "Truque do @: o site real vem depois." },
  { url: "https://www.itau.com.br.verificacao.top", label: "suspicious", note: "Domínio oficial dentro dos subdomínios." },
  { url: "https://bradesco.com.br.atualizar-dados.net", label: "suspicious", note: "Domínio oficial dentro dos subdomínios." },
  { url: "https://login.nubank.com.br.cadastro-seguro.online", label: "suspicious", note: "Domínio oficial dentro dos subdomínios." },
  { url: "https://g00gle.com", label: "suspicious", note: "Zeros no lugar de 'o'." },
  { url: "https://rnicrosoft.com", label: "suspicious", note: "'rn' imitando 'm'." },
  { url: "https://c0inbase.com", label: "suspicious", note: "Zero no lugar de 'o'." },
  { url: "https://\u0430pple.com", label: "suspicious", note: "'a' cirílico no lugar do 'a' latino." },
  { url: "https://p\u0430ypal.com", label: "suspicious", note: "'a' cirílico no lugar do 'a' latino." },
  { url: "https://googel.com", label: "suspicious", note: "Letras vizinhas trocadas." },
  { url: "https://paypall.com", label: "suspicious", note: "Uma letra a mais." },
  { url: "https://nubnak.com.br", label: "suspicious", note: "Letras vizinhas trocadas." },
  { url: "https://binanace.com", label: "suspicious", note: "Letras vizinhas trocadas." },
  { url: "https://mercadolivr.com.br", label: "suspicious", note: "Uma letra a menos." },
  { url: "https://itau-login.com", label: "suspicious", note: "Nome da marca com palavra de acesso." },
  { url: "https://itau.seguro-acesso.com.br", label: "suspicious", note: "Nome da marca no subdomínio." },
  { url: "https://secure-binance.com", label: "suspicious", note: "Nome da marca no domínio." },
  { url: "https://coinbase-wallet-support.com", label: "suspicious", note: "Nome da marca com 'wallet' e 'support'." },
  { url: "https://amazon.conta-verificacao.com", label: "suspicious", note: "Nome da marca no subdomínio." },
  { url: "https://paypal.xyz", label: "suspicious", note: "Nome da marca com outro sufixo." },
  { url: "https://apple-id-login.com", label: "suspicious", note: "Nome comum 'apple' com palavra de acesso." },
  { url: "https://amazon-suporte.com.br", label: "suspicious", note: "Nome comum 'amazon' com palavra de suporte." },

  // ---- Ambíguos (não entram nas métricas; mostram os limites) ----
  { url: "https://itau.com", label: "ambiguous", note: "Nome da marca com outro sufixo; sem fonte para dizer se pertence à organização." },
  { url: "https://paypay.ne.jp", label: "ambiguous", note: "Nome parecido com 'paypal', mas pode ser outra organização legítima." },
  { url: "https://www.apple-orchard-tours.com", label: "ambiguous", note: "Usa a palavra 'apple' em sentido comum (pomar)." },
  { url: "http://example.com", label: "ambiguous", note: "Domínio de exemplo, mas sem https." },
];