import { describe, it, expect } from "vitest";
import { analyzeWithNetwork } from "../src/analyzeNetwork";
import { ResolveError, type Resolver, type ResolvedAddress } from "../src/network/resolver";
import {
  TlsProbeError,
  createSystemTlsProbe,
  type TlsProbe,
  type TlsProbeResult,
  type TlsTarget,
} from "../src/network/tls";
import { sanitizeText, toCertificateInfo, type CertificateInfo } from "../src/network/certificate";
import type { Report } from "../src/report/types";

const DATA = new Date("2026-01-02T03:04:05Z");

const CERT: CertificateInfo = {
  issuer: "Autoridade Exemplo",
  validFrom: "2026-01-01T00:00:00.000Z",
  validTo: "2026-04-01T00:00:00.000Z",
  altNameCount: 2,
};

function ok(extra: Partial<TlsProbeResult> = {}): TlsProbeResult {
  return { authorized: true, authorizationError: null, certificate: CERT, ...extra };
}

function bad(code: string | null): TlsProbeResult {
  return { authorized: false, authorizationError: code, certificate: CERT };
}

function addr(a: string): ResolvedAddress {
  return { address: a, family: a.includes(":") ? 6 : 4 };
}

async function run(
  input: string,
  dnsResult: string[] | ResolveError,
  probeResult: TlsProbeResult | TlsProbeError,
  tls = true,
) {
  const dnsCalls: string[] = [];
  const probeCalls: TlsTarget[] = [];

  const resolver: Resolver = async (hostname) => {
    dnsCalls.push(hostname);
    if (dnsResult instanceof ResolveError) throw dnsResult;
    return dnsResult.map(addr);
  };
  const tlsProbe: TlsProbe = async (target) => {
    probeCalls.push(target);
    if (probeResult instanceof TlsProbeError) throw probeResult;
    return probeResult;
  };

  const r = await analyzeWithNetwork(input, { resolver, tlsProbe, tls, now: DATA });
  if (!r.ok) throw new Error(`esperava relatório, recebeu falha: ${r.reason}`);
  const report: Report = r;
  return { report, dnsCalls, probeCalls };
}

function connectionNotes(report: Report): string {
  return report.dimensions.connection.notes.join(" ");
}

describe("sanitizeText e toCertificateInfo", () => {
  it("remove caracteres de controle e de direção de texto", () => {
    const limpo = sanitizeText("Evil\u001b[31m CA\u202e\u0007");
    expect(limpo).not.toContain("\u001b");
    expect(limpo).not.toContain("\u202e");
    expect(limpo).not.toContain("\u0007");
  });

  it("limita o tamanho", () => {
    expect(sanitizeText("x".repeat(500)).length).toBeLessThanOrEqual(60);
  });

  it("lê emissor, datas e nomes alternativos", () => {
    const info = toCertificateInfo({
      issuer: { O: "Autoridade Exemplo", CN: "AE Raiz" },
      subjectaltname: "DNS:exemplo.com.br, DNS:*.exemplo.com.br, IP Address:1.2.3.4",
      valid_from: "Jan  1 00:00:00 2026 GMT",
      valid_to: "Apr  1 00:00:00 2026 GMT",
    });
    expect(info).toEqual({
      issuer: "Autoridade Exemplo",
      validFrom: "2026-01-01T00:00:00.000Z",
      validTo: "2026-04-01T00:00:00.000Z",
      altNameCount: 2,
    });
  });

  it("usa o CN quando não há organização", () => {
    expect(toCertificateInfo({ issuer: { CN: "AC Raiz" } })?.issuer).toBe("AC Raiz");
  });

  it("devolve null para certificado vazio ou ausente", () => {
    expect(toCertificateInfo({})).toBeNull();
    expect(toCertificateInfo(null)).toBeNull();
    expect(toCertificateInfo(undefined)).toBeNull();
  });

  it("datas ilegíveis viram null", () => {
    const info = toCertificateInfo({ valid_from: "lixo", valid_to: "outro lixo", issuer: { O: "X" } });
    expect(info?.validFrom).toBeNull();
    expect(info?.validTo).toBeNull();
  });
});

describe("a sonda real recusa endereços não públicos (sem tocar a rede)", () => {
  const alvos = ["127.0.0.1", "10.0.0.1", "192.168.1.1", "169.254.169.254", "::1", "::ffff:10.0.0.1", "nao-e-ip"];

  it.each(alvos)("%s é bloqueado", async (ip) => {
    const probe = createSystemTlsProbe();
    await expect(
      probe({ ip, port: 443, servername: "exemplo.com.br", timeoutMs: 1000 }),
    ).rejects.toMatchObject({ kind: "blocked" });
  });
});

describe("sem --tls nada é lido", () => {
  it("a sonda não é chamada e o relatório orienta o uso de --tls", async () => {
    const { report, probeCalls } = await run("https://exemplo.com.br", ["8.8.8.8"], ok(), false);
    expect(probeCalls).toHaveLength(0);
    expect(connectionNotes(report)).toContain("--tls");
    expect(report.privacy.networkActivity).toHaveLength(1); // só o DNS
  });
});

describe("casos em que a conexão não é feita", () => {
  it("http não tem certificado", async () => {
    const { report, probeCalls } = await run("http://exemplo.com.br", ["8.8.8.8"], ok());
    expect(probeCalls).toHaveLength(0);
    expect(connectionNotes(report)).toContain("não há certificado");
  });

  it("número IP", async () => {
    const { probeCalls } = await run("https://8.8.8.8", ["8.8.8.8"], ok());
    expect(probeCalls).toHaveLength(0);
  });

  it("nome de uso local", async () => {
    const { probeCalls } = await run("https://localhost", ["127.0.0.1"], ok());
    expect(probeCalls).toHaveLength(0);
  });

  it("porta diferente da 443", async () => {
    const { report, probeCalls } = await run("https://exemplo.com.br:8443", ["8.8.8.8"], ok());
    expect(probeCalls).toHaveLength(0);
    expect(connectionNotes(report)).toContain("porta 443");
  });

  it("DNS sem resultado", async () => {
    const { report, probeCalls } = await run(
      "https://exemplo.com.br",
      new ResolveError("not_found"),
      ok(),
    );
    expect(probeCalls).toHaveLength(0);
    expect(connectionNotes(report)).toContain("não pôde ser resolvido");
  });

  it("endereço interno (proteção SSRF)", async () => {
    const { report, probeCalls } = await run("https://exemplo.com.br", ["10.0.0.5"], ok());
    expect(probeCalls).toHaveLength(0);
    expect(connectionNotes(report)).toContain("não se conectou");
  });

  it("um endereço interno no meio dos públicos também impede a conexão", async () => {
    const { probeCalls } = await run("https://exemplo.com.br", ["8.8.8.8", "192.168.1.10"], ok());
    expect(probeCalls).toHaveLength(0);
  });
});

describe("conexão feita", () => {
  it("conecta ao IP validado, porta 443, com o nome do site", async () => {
    const { probeCalls, dnsCalls } = await run("https://exemplo.com.br", ["8.8.8.8"], ok());
    expect(dnsCalls).toEqual(["exemplo.com.br"]);
    expect(probeCalls).toHaveLength(1);
    expect(probeCalls[0]).toMatchObject({ ip: "8.8.8.8", port: 443, servername: "exemplo.com.br" });
    expect(typeof probeCalls[0].timeoutMs).toBe("number");
  });

  it("prefere IPv4 quando há IPv4 e IPv6", async () => {
    const { probeCalls } = await run(
      "https://exemplo.com.br",
      ["2606:4700:4700::1111", "8.8.8.8"],
      ok(),
    );
    expect(probeCalls[0].ip).toBe("8.8.8.8");
  });

  it("domínios internacionais usam punycode no nome do servidor", async () => {
    const { probeCalls } = await run("https://\u0430pple.com", ["8.8.8.8"], ok());
    expect(probeCalls[0].servername.startsWith("xn--")).toBe(true);
  });

  it("certificado aceito: sem sinais, e sem afirmar legitimidade", async () => {
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], ok());
    expect(report.dimensions.connection.signals).toEqual([]);
    expect(report.conclusion.level).toBe("no_signals_found");
    const notas = connectionNotes(report);
    expect(notas).toContain("não prova");
    expect(notas).toContain("revogação");
    expect(notas).toContain("Autoridade Exemplo");
    expect(notas).toContain("2026-01-01");
    expect(notas).toContain("2026-04-01");
  });

  it("registra as duas atividades de rede e avisa que o site vê o IP", async () => {
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], ok());
    expect(report.privacy.networkRequests).toBe(true);
    expect(report.privacy.networkActivity).toHaveLength(2);
    expect(report.privacy.networkActivity[1]).toContain("endereço IP");
    expect(report.privacy.networkActivity[1]).toContain("nenhuma requisição HTTP");
  });

  it("a limitação menciona a leitura do certificado", async () => {
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], ok());
    expect(report.limitations[0]).toContain("certificado TLS");
    expect(report.limitations.join(" ")).toContain("Nenhuma análise garante");
  });
});

describe("problemas no certificado", () => {
  const casos: Array<[string, string, string]> = [
    ["CERT_HAS_EXPIRED", "connection.tls_certificate_expired", "moderate_signals"],
    ["CERT_NOT_YET_VALID", "connection.tls_certificate_not_yet_valid", "moderate_signals"],
    ["ERR_TLS_CERT_ALTNAME_INVALID", "connection.tls_name_mismatch", "moderate_signals"],
    ["DEPTH_ZERO_SELF_SIGNED_CERT", "connection.tls_self_signed", "moderate_signals"],
    ["SELF_SIGNED_CERT_IN_CHAIN", "connection.tls_self_signed", "moderate_signals"],
    ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "connection.tls_untrusted_chain", "weak_signals"],
    ["UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "connection.tls_untrusted_chain", "weak_signals"],
    ["CERT_REVOKED", "connection.tls_verification_failed", "weak_signals"],
  ];

  it.each(casos)("%s -> %s", async (codigo, id, nivel) => {
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], bad(codigo));
    expect(report.dimensions.connection.signals.map((s) => s.id)).toEqual([id]);
    expect(report.conclusion.level).toBe(nivel);
  });

  it("não aparece a frase de aceitação quando o certificado é rejeitado", async () => {
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], bad("CERT_HAS_EXPIRED"));
    expect(connectionNotes(report)).not.toContain("foi aceito");
  });

  it("código desconhecido e seguro aparece no texto", async () => {
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], bad("CODIGO_NOVO_XYZ"));
    const s = report.dimensions.connection.signals[0];
    expect(s.id).toBe("connection.tls_verification_failed");
    expect(s.observation).toContain("CODIGO_NOVO_XYZ");
  });

  it("código com caracteres suspeitos não é repetido", async () => {
    const { report } = await run(
      "https://exemplo.com.br",
      ["8.8.8.8"],
      bad("x\u001b[31m injetado"),
    );
    const s = report.dimensions.connection.signals[0];
    expect(s.id).toBe("connection.tls_verification_failed");
    expect(JSON.stringify(report)).not.toContain("injetado");
  });

  it("sem código de erro, mas não autorizado", async () => {
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], bad(null));
    expect(report.dimensions.connection.signals.map((s) => s.id)).toEqual([
      "connection.tls_verification_failed",
    ]);
  });

  it("servidor sem certificado legível", async () => {
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], {
      authorized: false,
      authorizationError: null,
      certificate: null,
    });
    expect(report.dimensions.connection.signals.map((s) => s.id)).toEqual([
      "connection.tls_no_certificate",
    ]);
  });

  it("sempre declara a incerteza sobre a lista de autoridades", async () => {
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], bad("CERT_HAS_EXPIRED"));
    expect(report.dimensions.connection.signals[0].uncertainty).toContain("Node.js");
  });
});

describe("falhas da conexão", () => {
  const casos: Array<[string, TlsProbeError, string, number]> = [
    ["timeout", new TlsProbeError("timeout"), "demorou demais", 2],
    ["refused", new TlsProbeError("refused"), "recusou", 2],
    ["failed", new TlsProbeError("failed"), "Não foi possível concluir", 2],
    ["blocked", new TlsProbeError("blocked"), "bloqueada", 1],
  ];

  it.each(casos)("%s não gera sinal e é inconclusivo", async (_nome, erro, trecho, atividades) => {
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], erro);
    expect(report.dimensions.connection.signals).toEqual([]);
    expect(report.conclusion.level).toBe("no_signals_found");
    expect(connectionNotes(report)).toContain(trecho);
    expect(report.privacy.networkActivity).toHaveLength(atividades);
  });

  it("erro inesperado também vira resultado inconclusivo", async () => {
    const resolver: Resolver = async () => [addr("8.8.8.8")];
    const tlsProbe: TlsProbe = async () => {
      throw new Error("erro qualquer");
    };
    const r = await analyzeWithNetwork("https://exemplo.com.br", {
      resolver,
      tlsProbe,
      tls: true,
      now: DATA,
    });
    if (!r.ok) throw new Error("falha inesperada");
    expect(r.dimensions.connection.notes.join(" ")).toContain("Não foi possível concluir");
  });
});

describe("privacidade e texto hostil", () => {
  it("a sonda só recebe IP, porta, nome do site e tempo limite", async () => {
    const { probeCalls } = await run(
      "https://joao:senha999@exemplo.com.br/entrar?codigo=segredo777#frag555",
      ["8.8.8.8"],
      ok(),
    );
    expect(Object.keys(probeCalls[0]).sort()).toEqual(["ip", "port", "servername", "timeoutMs"]);
    expect(probeCalls[0].servername).toBe("exemplo.com.br");
  });

  it("o relatório não contém dados da URL nem os endereços IP", async () => {
    const { report } = await run(
      "https://joao:senha999@exemplo.com.br/entrar?codigo=segredo777#frag555",
      ["8.8.8.8"],
      ok(),
    );
    const json = JSON.stringify(report);
    for (const segredo of ["joao", "senha999", "segredo777", "frag555", "/entrar", "8.8.8.8"]) {
      expect(json).not.toContain(segredo);
    }
  });

  it("emissor hostil não leva caracteres de controle ao relatório", async () => {
    const hostil = ok({ certificate: { ...CERT, issuer: "Evil\u001b[31mCA\u202e" } });
    const { report } = await run("https://exemplo.com.br", ["8.8.8.8"], hostil);
    const notas = connectionNotes(report);
    expect(notas).not.toContain("\u001b");
    expect(notas).not.toContain("\u202e");
  });
});

describe("linguagem", () => {
  it("nunca usa linguagem de veredito", async () => {
    const todos = await Promise.all([
      run("https://exemplo.com.br", ["8.8.8.8"], ok()),
      run("https://exemplo.com.br", ["8.8.8.8"], bad("CERT_HAS_EXPIRED")),
      run("https://exemplo.com.br", ["8.8.8.8"], bad("DEPTH_ZERO_SELF_SIGNED_CERT")),
      run("https://exemplo.com.br", ["8.8.8.8"], bad("ERR_TLS_CERT_ALTNAME_INVALID")),
      run("https://exemplo.com.br", ["8.8.8.8"], new TlsProbeError("timeout")),
    ]);
    for (const { report } of todos) {
      const texto = JSON.stringify(report);
      expect(texto).not.toMatch(/100%|definitiv|é golpe|é fraude|site falso/i);
      expect(texto).not.toMatch(/\bé seguro\b/i);
    }
  });
});