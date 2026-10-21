import { describe, it, expect } from "vitest";
import { analyze } from "../src/analyze";
import { normalizeUrl } from "../src/url/normalize";
import { detectBrandSignals } from "../src/signals/brandImpersonation";
import type { Report } from "../src/report/types";

function rep(input: string): Report {
  const r = analyze(input);
  if (!r.ok) throw new Error(`esperava relatório, recebeu falha: ${r.reason}`);
  return r;
}

function brandSignals(input: string) {
  const r = normalizeUrl(input);
  if (!r.ok) throw new Error(`falha ao normalizar: ${r.reason}`);
  return detectBrandSignals(r);
}

describe("nomes de uso local", () => {
  const locais = [
    "http://localhost",
    "http://localhost:3000",
    "http://app.localhost:8080",
    "http://meu-roteador.local",
    "http://intranet.internal",
  ];

  it.each(locais)("%s não é marcado como risco", (url) => {
    const r = rep(url);
    expect(r.conclusion.level).toBe("no_signals_found");
    expect(r.dimensions.connection.signals).toEqual([]);
    expect(r.dimensions.identity.signals.map((s) => s.id)).toEqual(["identity.local_name"]);
  });

  it("http em domínio público continua sendo sinalizado", () => {
    const r = rep("http://exemplo.com.br");
    expect(r.dimensions.connection.signals.map((s) => s.id)).toContain("connection.no_https");
  });

  it("um nome que apenas começa com localhost não é tratado como local", () => {
    const r = rep("http://localhost.exemplo.com.br");
    expect(r.dimensions.connection.signals.map((s) => s.id)).toContain("connection.no_https");
  });
});

describe("marcas com nome de uso comum", () => {
  it("palavra comum sozinha gera só aviso leve", () => {
    const s = brandSignals("https://www.apple-orchard-tours.com");
    expect(s).toHaveLength(1);
    expect(s[0].id).toBe("identity.brand_in_domain_name");
    expect(s[0].severity).toBe("low");
    expect(rep("https://www.apple-orchard-tours.com").conclusion.level).toBe("weak_signals");
  });

  it.each(["https://apple-id-login.com", "https://amazon-suporte.com.br"])(
    "%s continua moderado por causa da palavra de acesso",
    (url) => {
      const s = brandSignals(url);
      expect(s).toHaveLength(1);
      expect(s[0].severity).toBe("medium");
    },
  );

  it("marcas sem nome comum continuam moderadas", () => {
    const s = brandSignals("https://itau-florestas.com.br");
    expect(s).toHaveLength(1);
    expect(s[0].severity).toBe("medium");
  });

  it("não usa linguagem de veredito", () => {
    const texto = JSON.stringify(brandSignals("https://www.apple-orchard-tours.com"));
    expect(texto).not.toMatch(/100%|definitiv|é golpe|é fraude|site falso/i);
  });
});

describe("domínios oficiais adicionados", () => {
  it("Mercado Libre (Argentina) não é marcado como imitação", () => {
    expect(rep("https://www.mercadolibre.com.ar").conclusion.level).toBe("no_signals_found");
  });
});