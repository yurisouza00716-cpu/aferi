import { describe, it, expect } from "vitest";
import { analyze } from "../src/analyze";
import { analyzeWithNetwork } from "../src/analyzeNetwork";
import { classifyAddress } from "../src/network/ipGuard";
import { ResolveError, type Resolver, type ResolvedAddress } from "../src/network/resolver";
import type { Report } from "../src/report/types";

const DATA = new Date("2026-01-02T03:04:05Z");

function addr(a: string): ResolvedAddress {
  return { address: a, family: a.includes(":") ? 6 : 4 };
}

function fakeResolver(result: string[] | ResolveError) {
  const calls: string[] = [];
  const resolver: Resolver = async (hostname) => {
    calls.push(hostname);
    if (result instanceof ResolveError) throw result;
    return result.map(addr);
  };
  return { resolver, calls };
}

async function net(input: string, result: string[] | ResolveError) {
  const f = fakeResolver(result);
  const r = await analyzeWithNetwork(input, { resolver: f.resolver, now: DATA });
  if (!r.ok) throw new Error(`esperava relatório, recebeu falha: ${r.reason}`);
  const report: Report = r;
  return { report, calls: f.calls };
}

describe("classifyAddress", () => {
  const casos: Array<[string, string | null]> = [
    ["8.8.8.8", "public"],
    ["127.0.0.1", "loopback"],
    ["10.1.2.3", "private"],
    ["192.168.0.10", "private"],
    ["169.254.169.254", "link-local"],
    ["::1", "loopback"],
    ["::ffff:10.0.0.1", "private"],
    ["fd00::1", "private"],
    ["2606:4700:4700::1111", "public"],
    ["fe80::1%eth0", null],
    ["999.1.1.1", null],
    ["nao-e-ip", null],
  ];

  it.each(casos)("%s -> %s", (entrada, esperado) => {
    expect(classifyAddress(entrada)).toBe(esperado);
  });
});

describe("modo padrão continua sem rede", () => {
  it("analyze() não registra atividade de rede", () => {
    const r = analyze("https://exemplo.com.br", DATA);
    if (!r.ok) throw new Error("falha inesperada");
    expect(r.privacy.networkRequests).toBe(false);
    expect(r.privacy.networkActivity).toEqual([]);
  });
});

describe("DNS: casos em que nada é consultado", () => {
  const entradas = ["http://8.8.8.8", "http://192.168.0.1", "http://localhost:3000", "http://meu-roteador.local"];

  it.each(entradas)("%s não gera consulta", async (url) => {
    const { report, calls } = await net(url, ["8.8.8.8"]);
    expect(calls).toHaveLength(0);
    expect(report.privacy.networkRequests).toBe(false);
    expect(report.dimensions.connection.notes.join(" ")).toContain("não houve consulta de DNS");
  });

  it("entrada inválida não chama o resolvedor", async () => {
    const f = fakeResolver(["8.8.8.8"]);
    const r = await analyzeWithNetwork("javascript:alert(1)", { resolver: f.resolver });
    expect(r.ok).toBe(false);
    expect(f.calls).toHaveLength(0);
  });
});

describe("DNS: resolução pública", () => {
  it("registra a consulta e não acrescenta sinais", async () => {
    const { report, calls } = await net("https://exemplo.com.br", ["8.8.8.8", "2606:4700:4700::1111"]);
    expect(calls).toEqual(["exemplo.com.br"]);
    expect(report.privacy.networkRequests).toBe(true);
    expect(report.privacy.networkActivity).toHaveLength(1);
    expect(report.dimensions.connection.signals).toEqual([]);
    expect(report.dimensions.connection.notes.join(" ")).toContain("2 endereço");
    expect(report.conclusion.level).toBe("no_signals_found");
  });

  it("o texto não afirma segurança nem identidade", async () => {
    const { report } = await net("https://exemplo.com.br", ["8.8.8.8"]);
    expect(report.dimensions.connection.notes.join(" ")).toContain("não diz quem controla o site");
    expect(report.limitations.join(" ")).toContain("Nenhuma análise garante");
  });
});

describe("DNS: proteção contra apontamento para redes internas", () => {
  const casos: Array<[string, string[]]> = [
    ["loopback", ["127.0.0.1"]],
    ["rede privada", ["10.0.0.5"]],
    ["link-local (metadados de nuvem)", ["169.254.169.254"]],
    ["IPv4 mapeado em IPv6", ["::ffff:10.0.0.1"]],
    ["misturado com público", ["8.8.8.8", "192.168.1.10"]],
    ["IPv6 com zona (não classificável)", ["fe80::1%eth0"]],
  ];

  it.each(casos)("%s é sinalizado", async (_nome, enderecos) => {
    const { report } = await net("https://exemplo.com.br", enderecos);
    const sinais = report.dimensions.connection.signals;
    expect(sinais.map((s) => s.id)).toEqual(["connection.dns_resolves_to_non_public"]);
    expect(sinais[0].severity).toBe("medium");
    expect(report.conclusion.level).toBe("moderate_signals");
    expect(sinais[0].inference).toContain("não se conecta");
  });

  it("não escreve os endereços internos no relatório", async () => {
    const { report } = await net("https://exemplo.com.br", ["10.0.0.5"]);
    expect(JSON.stringify(report)).not.toContain("10.0.0.5");
  });
});

describe("DNS: falhas", () => {
  it("nome não encontrado vira apenas informação", async () => {
    const { report } = await net("https://exemplo-inexistente.com.br", new ResolveError("not_found"));
    const sinais = report.dimensions.connection.signals;
    expect(sinais.map((s) => s.id)).toEqual(["connection.dns_not_found"]);
    expect(sinais[0].severity).toBe("info");
    expect(report.conclusion.level).toBe("no_signals_found");
    expect(report.privacy.networkRequests).toBe(true);
  });

  it("lista vazia equivale a não encontrado", async () => {
    const { report } = await net("https://exemplo.com.br", []);
    expect(report.dimensions.connection.signals.map((s) => s.id)).toEqual(["connection.dns_not_found"]);
  });

  it("tempo esgotado não gera sinal e declara que é inconclusivo", async () => {
    const { report } = await net("https://exemplo.com.br", new ResolveError("timeout"));
    expect(report.dimensions.connection.signals).toEqual([]);
    expect(report.dimensions.connection.notes.join(" ")).toContain("demorou demais");
    expect(report.conclusion.level).toBe("no_signals_found");
  });

  it("falha genérica não gera sinal e declara que é inconclusivo", async () => {
    const { report } = await net("https://exemplo.com.br", new ResolveError("failed"));
    expect(report.dimensions.connection.signals).toEqual([]);
    expect(report.dimensions.connection.notes.join(" ")).toContain("não é conclusivo");
  });
});

describe("DNS: privacidade", () => {
  it("só o nome do domínio chega ao resolvedor", async () => {
    const { report, calls } = await net(
      "https://joao:senha999@exemplo.com.br/entrar?codigo=segredo777#frag555",
      ["8.8.8.8"],
    );
    expect(calls).toEqual(["exemplo.com.br"]);
    const json = JSON.stringify(report);
    for (const segredo of ["joao", "senha999", "segredo777", "frag555", "/entrar"]) {
      expect(json).not.toContain(segredo);
    }
  });

  it("domínios internacionais são consultados em punycode", async () => {
    const { calls } = await net("https://\u0430pple.com", ["8.8.8.8"]);
    expect(calls).toHaveLength(1);
    expect(calls[0].startsWith("xn--")).toBe(true);
  });

  it("sinais de texto e de rede se combinam", async () => {
    const { report } = await net("https://paypa1.com", ["10.0.0.5"]);
    expect(report.conclusion.level).toBe("strong_signals");
    expect(report.dimensions.connection.signals).toHaveLength(1);
    expect(report.dimensions.identity.signals.length).toBeGreaterThan(0);
  });
});

describe("linguagem", () => {
  it("nunca usa linguagem de veredito", async () => {
    const todos = await Promise.all([
      net("https://exemplo.com.br", ["10.0.0.5"]),
      net("https://exemplo.com.br", ["8.8.8.8"]),
      net("https://exemplo.com.br", new ResolveError("not_found")),
      net("https://exemplo.com.br", new ResolveError("timeout")),
    ]);
    for (const { report } of todos) {
      const texto = JSON.stringify(report);
      expect(texto).not.toMatch(/100%|definitiv|é golpe|é fraude|site falso/i);
      expect(texto).not.toMatch(/\bé seguro\b/i);
    }
  });
});