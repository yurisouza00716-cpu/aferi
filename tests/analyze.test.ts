import { describe, it, expect } from "vitest";
import { analyze, AFERI_VERSION } from "../src/analyze";
import { renderText } from "../src/report/render";
import type { Report } from "../src/report/types";

const DATA = new Date("2026-01-02T03:04:05Z");

function rep(input: string): Report {
  const r = analyze(input, DATA);
  if (!r.ok) throw new Error(`esperava relatório, recebeu falha: ${r.reason}`);
  return r;
}

describe("entradas inválidas", () => {
  const falhas: Array<[string, string]> = [
    ["", "empty"],
    ["javascript:alert(1)", "unsupported_scheme"],
    ["https://exa mple.com", "invalid_url"],
  ];

  it.each(falhas)("%j vira falha com motivo %s", (entrada, motivo) => {
    const r = analyze(entrada, DATA);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe(motivo);
      expect(r.message.length).toBeGreaterThan(0);
      if (entrada) expect(JSON.stringify(r)).not.toContain(entrada);
    }
  });
});

describe("estrutura do relatório", () => {
  it("usa a data informada e a versão", () => {
    const r = rep("https://www.paypal.com/");
    expect(r.analyzedAt).toBe("2026-01-02T03:04:05.000Z");
    expect(r.aferiVersion).toBe(AFERI_VERSION);
    expect(r.privacy.networkRequests).toBe(false);
  });

  it("separa as quatro dimensões e declara o que não foi analisado", () => {
    const r = rep("https://www.paypal.com/");
    expect(Object.keys(r.dimensions)).toEqual([
      "connection",
      "identity",
      "behavior",
      "reputation",
    ]);
    expect(r.dimensions.behavior.status).toBe("not_analyzed");
    expect(r.dimensions.reputation.status).toBe("not_analyzed");
    expect(r.dimensions.connection.status).toBe("not_analyzed");
  });

  it("não afirma identidade quando nenhum sinal é encontrado", () => {
    const r = rep("https://www.paypal.com/");
    expect(r.dimensions.identity.status).toBe("no_signals_found");
    expect(r.conclusion.summary).toContain("não confirma");
    expect(r.limitations.join(" ")).toContain("Nenhuma análise garante");
  });

  it("explica que https não prova legitimidade", () => {
    const r = rep("https://exemplo.com.br");
    expect(r.dimensions.connection.notes.join(" ")).toContain("não prova");
  });
});

describe("níveis de conclusão", () => {
  const niveis: Array<[string, string]> = [
    ["https://www.paypal.com/", "no_signals_found"],
    ["https://exemplo.com.br", "no_signals_found"],
    ["http://127.0.0.1", "no_signals_found"],
    ["https://mercadolvr.com.br", "weak_signals"],
    ["https://googel.com", "moderate_signals"],
    ["http://paypal.xyz", "moderate_signals"],
    ["http://8.8.8.8", "moderate_signals"],
    ["https://paypa1.com", "strong_signals"],
    ["https://paypal.com.login-seguro.xyz", "strong_signals"],
    ["https://paypal.com@site-falso.xyz", "strong_signals"],
  ];

  it.each(niveis)("%s -> %s", (url, esperado) => {
    expect(rep(url).conclusion.level).toBe(esperado);
  });

  it("sinais fortes recomendam não inserir dados", () => {
    const r = rep("https://paypa1.com");
    expect(r.conclusion.recommendation).toContain("Não insira");
  });
});

describe("sinais estruturais", () => {
  it("http gera sinal na dimensão conexão", () => {
    const r = rep("http://exemplo.com.br");
    expect(r.dimensions.connection.status).toBe("signals_found");
    expect(r.dimensions.connection.signals[0].id).toBe("connection.no_https");
  });

  it("não alerta http em IP local", () => {
    const r = rep("http://192.168.1.1");
    expect(r.dimensions.connection.signals).toEqual([]);
  });

  it("detecta o truque do @", () => {
    const r = rep("https://paypal.com@site-falso.xyz");
    expect(r.dimensions.identity.signals.map((s) => s.id)).toContain(
      "identity.credentials_look_like_domain",
    );
    expect(r.target.hostname).toBe("site-falso.xyz");
  });

  it("sinaliza porta incomum", () => {
    const r = rep("https://exemplo.com.br:8443");
    expect(r.dimensions.connection.signals.map((s) => s.id)).toContain(
      "connection.non_standard_port",
    );
  });

  it("ordena os sinais do mais grave para o mais leve", () => {
    const sinais = rep("https://paypa1.com:8443").dimensions.connection.signals;
    const ranks = { info: 0, low: 1, medium: 2, high: 3 } as const;
    for (let i = 1; i < sinais.length; i++) {
      expect(ranks[sinais[i - 1].severity]).toBeGreaterThanOrEqual(ranks[sinais[i].severity]);
    }
  });
});

describe("privacidade", () => {
  const entrada =
    "https://joaosecreto:senha999@paypa1.com/entrar?codigo=xyz789#frag555";

  it("o relatório não contém dados sensíveis da URL", () => {
    const r = rep(entrada);
    const json = JSON.stringify(r);
    for (const segredo of ["joaosecreto", "senha999", "xyz789", "frag555", "/entrar"]) {
      expect(json).not.toContain(segredo);
    }
    expect(r.target.origin).toBe("https://paypa1.com");
  });

  it("informa o que foi omitido, sem repetir o conteúdo", () => {
    const r = rep(entrada);
    expect(r.privacy.omittedFromReport.length).toBe(4);
  });

  it("o texto da CLI também não vaza", () => {
    const texto = renderText(analyze(entrada, DATA));
    for (const segredo of ["joaosecreto", "senha999", "xyz789", "frag555", "/entrar"]) {
      expect(texto).not.toContain(segredo);
    }
  });
});

describe("linguagem", () => {
  const urls = [
    "https://www.paypal.com/",
    "https://paypa1.com",
    "https://\u0430pple.com",
    "https://googel.com",
    "https://mercadolvr.com.br",
    "http://8.8.8.8",
    "http://127.0.0.1",
    "https://paypal.com@site-falso.xyz",
    "https://paypal.com.login-seguro.xyz",
  ];

  it.each(urls)("%s nunca usa linguagem de veredito", (url) => {
    const json = JSON.stringify(rep(url));
    const texto = renderText(analyze(url, DATA));
    for (const conteudo of [json, texto]) {
      expect(conteudo).not.toMatch(/100%|definitiv|é golpe|é fraude|site falso/i);
      expect(conteudo).not.toMatch(/\bé seguro\b/i);
    }
  });
});

describe("apresentação em texto", () => {
  it("mostra todas as seções", () => {
    const texto = renderText(analyze("https://paypa1.com/entrar?x=segredo777", DATA));
    for (const secao of [
      "Conexão",
      "Identidade",
      "Comportamento",
      "Reputação",
      "Conclusão",
      "Recomendação",
      "Privacidade",
      "Limitações",
    ]) {
      expect(texto).toContain(secao);
    }
    expect(texto).not.toContain("undefined");
    expect(texto).not.toContain("segredo777");
  });

  it("explica falhas de forma legível", () => {
    expect(renderText(analyze("", DATA))).toContain("Nenhum endereço");
  });
});