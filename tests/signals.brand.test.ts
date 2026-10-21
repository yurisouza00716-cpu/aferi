import { describe, it, expect } from "vitest";
import { normalizeUrl } from "../src/url/normalize";
import { detectBrandSignals } from "../src/signals/brandImpersonation";

function sinais(entrada: string) {
  const r = normalizeUrl(entrada);
  if (!r.ok) throw new Error(`falha ao normalizar: ${r.reason}`);
  return detectBrandSignals(r);
}

describe("endereços que não devem gerar sinal", () => {
  const legitimos = [
    "https://www.paypal.com/signin",
    "https://login.microsoftonline.com",
    "https://www.itau.com.br",
    "https://www.google.com.br",
    "https://pineapple.com", // contém "apple" dentro de outra palavra
    "https://applebees.com",
    "https://exemplo.com.br",
    "http://8.8.8.8",
  ];

  it.each(legitimos)("%s", (url) => {
    expect(sinais(url)).toEqual([]);
  });
});

describe("domínio oficial dentro dos subdomínios (alto)", () => {
  it("paypal.com.login-seguro.xyz", () => {
    const s = sinais("https://paypal.com.login-seguro.xyz");
    expect(s).toHaveLength(1);
    expect(s[0].id).toBe("identity.official_domain_in_subdomain");
    expect(s[0].severity).toBe("high");
    expect(s[0].brandId).toBe("paypal");
  });

  it("www.itau.com.br.verificacao.top", () => {
    const s = sinais("https://www.itau.com.br.verificacao.top");
    expect(s).toHaveLength(1);
    expect(s[0].id).toBe("identity.official_domain_in_subdomain");
    expect(s[0].brandId).toBe("itau");
  });
});

describe("nome da marca em domínio ou subdomínio (médio)", () => {
  it("nome no subdomínio", () => {
    const s = sinais("https://itau.seguro-acesso.com.br");
    expect(s).toHaveLength(1);
    expect(s[0].id).toBe("identity.brand_in_subdomain");
    expect(s[0].severity).toBe("medium");
  });

  it("nome no domínio, separado por hífen", () => {
    const s = sinais("https://itau-login.com");
    expect(s).toHaveLength(1);
    expect(s[0].id).toBe("identity.brand_in_domain_name");
  });

  it("nome da marca com outro sufixo", () => {
    const s = sinais("https://paypal.xyz");
    expect(s).toHaveLength(1);
    expect(s[0].id).toBe("identity.brand_in_domain_name");
  });
});

describe("privacidade e linguagem", () => {
  it("não vaza query string nem credenciais nos sinais", () => {
    const s = sinais("https://usuario:senha999@paypal.com.evil.xyz/login?token=segredo123");
    const texto = JSON.stringify(s);
    expect(s.length).toBeGreaterThan(0);
    expect(texto).not.toContain("segredo123");
    expect(texto).not.toContain("senha999");
    expect(texto).not.toContain("usuario");
  });

  it("nunca usa linguagem de veredito e sempre declara incerteza", () => {
    const s = [
      ...sinais("https://paypal.com.login-seguro.xyz"),
      ...sinais("https://itau-login.com"),
      ...sinais("https://itau.seguro-acesso.com.br"),
    ];
    expect(s.length).toBeGreaterThan(0);
    for (const sinal of s) {
      const texto = `${sinal.observation} ${sinal.inference} ${sinal.uncertainty}`;
      expect(texto).not.toMatch(/100%|definitiv|é golpe|é fraude|site falso/i);
      expect(sinal.uncertainty.length).toBeGreaterThan(0);
    }
  });
});